import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiAuth } from "@/lib/auth";
import { createBookingSchema } from "@/lib/validations";
import { computeCharge, settleBooking } from "@/lib/booking-pricing";
import { sendBookingConfirmation } from "@/lib/email";
import { apiError, apiSuccess, buildPaginationMeta, getPaginationParams } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return apiError("Unauthorized", 401);
  const orgId = auth.organizationId;

  const sp = req.nextUrl.searchParams;
  const start = sp.get("start");
  const end = sp.get("end");
  const resourceId = sp.get("resourceId");
  const memberId = sp.get("memberId");
  const status = sp.get("status");
  const { page, limit, skip } = getPaginationParams(sp);

  const isCalendarMode = !!(start && end);

  const where = {
    organizationId: orgId,
    deletedAt: null,
    ...(isCalendarMode && {
      OR: [
        { startTime: { gte: new Date(start!), lt: new Date(end!) } },
        { endTime: { gt: new Date(start!), lte: new Date(end!) } },
      ],
    }),
    ...(resourceId && { resourceId }),
    ...(memberId && { memberId }),
    ...(status && { status: status as any }),
  };

  if (isCalendarMode) {
    // Scalar-only select → ONE database round-trip instead of four.
    // The calendar client already holds resource & member names (passed
    // as props), so it maps ids → names locally. This avoids Prisma's
    // relation fan-out, which over a distant DB cost ~1s per relation.
    const bookings = await prisma.booking.findMany({
      where,
      select: {
        id: true, title: true, startTime: true, endTime: true,
        status: true, resourceId: true, memberId: true,
      },
      orderBy: { startTime: "asc" },
    });
    return apiSuccess({ data: bookings, meta: null });
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        resource: { select: { id: true, name: true, type: true } },
        member: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
      orderBy: { startTime: "asc" },
      skip,
      take: limit,
    }),
    prisma.booking.count({ where }),
  ]);

  return apiSuccess({ data: bookings, meta: buildPaginationMeta(total, page, limit) });
}

export async function POST(req: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return apiError("Unauthorized", 401);
  const orgId = auth.organizationId;
  const userId = auth.userId;

  const body = await req.json();
  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");

  const { resourceId, memberId, startTime, endTime, title, description, attendees } = parsed.data;

  // Verify resource belongs to org
  const resource = await prisma.resource.findFirst({
    where: { id: resourceId, organizationId: orgId, isActive: true, deletedAt: null },
  });
  if (!resource) return apiError("Resource not found", 404);

  // Overlap check
  const conflict = await prisma.booking.findFirst({
    where: {
      resourceId,
      deletedAt: null,
      status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
      AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
    },
  });
  if (conflict) return apiError("This resource is already booked for that time slot", 409);

  // Pricing + credit settlement
  const { amount, creditsNeeded } = computeCharge(resource, startTime, endTime);
  const member = memberId
    ? await prisma.member.findFirst({ where: { id: memberId, organizationId: orgId, deletedAt: null }, select: { id: true, credits: true } })
    : null;
  const { creditsUsed, amountCharged } = settleBooking({
    amount, creditsNeeded, memberCredits: member ? member.credits : null,
  });

  const booking = await prisma.$transaction(async (tx) => {
    if (creditsUsed > 0 && member) {
      await tx.member.update({ where: { id: member.id }, data: { credits: { decrement: creditsUsed } } });
    }
    return tx.booking.create({
      data: {
        organizationId: orgId,
        resourceId,
        memberId: memberId ?? null,
        userId: userId,
        title: title ?? null,
        description: description ?? null,
        startTime,
        endTime,
        attendees: attendees ?? 1,
        status: resource.requiresApproval ? "PENDING" : "CONFIRMED",
        amountCharged,
        creditsUsed,
      },
      include: {
        resource: true,
        member: { include: { user: true } },
        organization: { select: { name: true, currency: true } },
      },
    });
  });

  // Booking confirmation email (fire-and-forget — never blocks the response)
  if (booking.member?.user?.email) {
    void sendBookingConfirmation({
      to: booking.member.user.email,
      memberName: booking.member.user.name,
      orgName: booking.organization.name,
      resourceName: booking.resource.name,
      start: booking.startTime,
      end: booking.endTime,
      amountCharged: Number(booking.amountCharged),
      creditsUsed: booking.creditsUsed,
      currency: booking.organization.currency,
      status: booking.status,
    });
  }

  return apiSuccess(booking, 201);
}
