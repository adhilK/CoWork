import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth";
import { createBookingSchema } from "@/lib/validations";
import { computeCharge, settleBooking } from "@/lib/booking-pricing";
import { validateWithinOpeningHours } from "@/lib/opening-hours";
import { sendBookingConfirmation } from "@/lib/email";
import { apiError, apiSuccess, buildPaginationMeta, getPaginationParams } from "@/lib/utils";
import { addDays, addWeeks, addMonths } from "date-fns";
import { nanoid } from "nanoid";

/** Generate all (start, end) pairs for a recurring series (max 104 = 2 years weekly). */
function buildRecurringSlots(
  start: Date, end: Date,
  pattern: "DAILY" | "WEEKLY" | "MONTHLY",
  until: Date
): Array<{ start: Date; end: Date }> {
  const duration = end.getTime() - start.getTime();
  const slots: Array<{ start: Date; end: Date }> = [];
  let cur = start;
  while (cur <= until && slots.length < 104) {
    slots.push({ start: cur, end: new Date(cur.getTime() + duration) });
    if (pattern === "DAILY") cur = addDays(cur, 1);
    else if (pattern === "WEEKLY") cur = addWeeks(cur, 1);
    else cur = addMonths(cur, 1);
  }
  return slots;
}

export async function GET(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);
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
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);
  const orgId = auth.organizationId;
  const userId = auth.userId;

  const body = await req.json();
  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");

  const { resourceId, memberId, startTime, endTime, title, description, attendees, recurring, recurringUntil } = parsed.data;

  // Verify resource belongs to org. Pull the location's opening hours +
  // timezone (and org timezone fallback) so we can enforce open hours.
  const resource = await prisma.resource.findFirst({
    where: { id: resourceId, organizationId: orgId, isActive: true, deletedAt: null },
    include: {
      location: { select: { openingHours: true, timezone: true } },
      organization: { select: { timezone: true } },
    },
  });
  if (!resource) return apiError("Resource not found", 404);

  const tz = resource.location?.timezone ?? resource.organization.timezone;

  // Build the full list of slots (1 for one-off, N for recurring)
  const isRecurring = recurring !== "NONE" && !!recurringUntil;
  const slots = isRecurring
    ? buildRecurringSlots(startTime, endTime, recurring as "DAILY" | "WEEKLY" | "MONTHLY", recurringUntil!)
    : [{ start: startTime, end: endTime }];

  // Opening-hours check for ALL slots (recurring occurrences may land on a
  // closed day) before creating any.
  for (const slot of slots) {
    const hoursError = validateWithinOpeningHours(
      resource.location?.openingHours, tz, slot.start, slot.end
    );
    if (hoursError) return apiError(hoursError, 422);
  }

  // Conflict check for ALL slots before creating any
  for (const slot of slots) {
    const conflict = await prisma.booking.findFirst({
      where: {
        resourceId,
        deletedAt: null,
        status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
        AND: [{ startTime: { lt: slot.end } }, { endTime: { gt: slot.start } }],
      },
      select: { startTime: true },
    });
    if (conflict) {
      return apiError(
        `Resource already booked on ${conflict.startTime.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} at that time`,
        409
      );
    }
  }

  // Pricing + credit settlement (based on first slot — all slots same duration)
  const { amount, creditsNeeded } = computeCharge(resource, startTime, endTime);
  const member = memberId
    ? await prisma.member.findFirst({ where: { id: memberId, organizationId: orgId, deletedAt: null }, select: { id: true, credits: true } })
    : null;
  const { creditsUsed, amountCharged } = settleBooking({
    amount, creditsNeeded, memberCredits: member ? member.credits : null,
  });

  const recurringGroupId = isRecurring ? nanoid() : null;
  const status = resource.requiresApproval ? "PENDING" as const : "CONFIRMED" as const;

  const bookings = await prisma.$transaction(async (tx) => {
    // Deduct credits once (for the first occurrence)
    if (creditsUsed > 0 && member) {
      await tx.member.update({ where: { id: member.id }, data: { credits: { decrement: creditsUsed } } });
    }
    return Promise.all(
      slots.map((slot) =>
        tx.booking.create({
          data: {
            organizationId: orgId,
            resourceId,
            memberId: memberId ?? null,
            userId,
            title: title ?? null,
            description: description ?? null,
            startTime: slot.start,
            endTime: slot.end,
            attendees: attendees ?? 1,
            status,
            amountCharged: amountCharged,
            creditsUsed: creditsUsed,
            isRecurring: isRecurring,
            recurringGroupId,
          },
          include: {
            resource: true,
            member: { include: { user: true } },
            organization: { select: { name: true, currency: true } },
          },
        })
      )
    );
  });

  const first = bookings[0]!;

  // Booking confirmation email (fire-and-forget)
  if (first.member?.user?.email) {
    void sendBookingConfirmation({
      to: first.member.user.email,
      memberName: first.member.user.name,
      orgName: first.organization.name,
      resourceName: first.resource.name,
      start: first.startTime,
      end: first.endTime,
      amountCharged: Number(first.amountCharged),
      creditsUsed: first.creditsUsed,
      currency: first.organization.currency,
      status: first.status,
    });
  }

  return apiSuccess(
    isRecurring ? { bookings, count: bookings.length, recurringGroupId } : first,
    201
  );
}
