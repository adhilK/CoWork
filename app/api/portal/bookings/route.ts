import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { computeCharge, settleBooking } from "@/lib/booking-pricing";
import { sendBookingConfirmation } from "@/lib/email";
import { apiError, apiSuccess } from "@/lib/utils";
import { createCalendarEvent } from "@/lib/google-calendar";

async function getMember(userId: string) {
  return prisma.member.findFirst({
    where: { userId, deletedAt: null },
    select: { id: true, organizationId: true, credits: true },
  });
}

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const member = await getMember(user.id);
  if (!member) return apiError("Member not found", 404);

  const sp = req.nextUrl.searchParams;
  const upcoming = sp.get("upcoming") === "true";

  const now = new Date();

  const bookings = await prisma.booking.findMany({
    where: {
      memberId: member.id,
      organizationId: member.organizationId,
      deletedAt: null,
      ...(upcoming && { startTime: { gte: now } }),
    },
    include: {
      resource: {
        select: {
          id: true,
          name: true,
          type: true,
          location: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { startTime: "desc" },
  });

  return apiSuccess(bookings);
}

const createPortalBookingSchema = z
  .object({
    resourceId: z.string().min(1, "Resource is required"),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    title: z.string().max(100).optional().nullable(),
    attendees: z.number().int().min(1).max(500).default(1),
  })
  .refine((d) => d.endTime > d.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  })
  .refine(
    (d) => (d.endTime.getTime() - d.startTime.getTime()) >= 30 * 60 * 1000,
    { message: "Minimum booking duration is 30 minutes", path: ["endTime"] }
  );

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const member = await getMember(user.id);
  if (!member) return apiError("Member not found", 404);

  const body = await req.json().catch(() => ({}));
  const parsed = createPortalBookingSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { resourceId, startTime, endTime, title, attendees } = parsed.data;

  // Verify resource belongs to the member's organization and is active
  const resource = await prisma.resource.findFirst({
    where: {
      id: resourceId,
      organizationId: member.organizationId,
      isActive: true,
      deletedAt: null,
    },
  });
  if (!resource) return apiError("Resource not found", 404);

  // Capacity check
  if (attendees > resource.capacity) {
    return apiError(
      `This resource holds up to ${resource.capacity} people`,
      400
    );
  }

  // Advance booking check
  const maxAdvanceMs = resource.advanceBookingDays * 24 * 60 * 60 * 1000;
  if (startTime.getTime() - Date.now() > maxAdvanceMs) {
    return apiError(
      `This resource can only be booked up to ${resource.advanceBookingDays} days in advance`,
      400
    );
  }

  // Conflict check
  const conflict = await prisma.booking.findFirst({
    where: {
      resourceId,
      deletedAt: null,
      status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
      AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
    },
  });
  if (conflict) {
    return apiError("Resource already booked for that time", 409);
  }

  // Pricing + credit settlement (same rules as the admin app)
  const { amount, creditsNeeded } = computeCharge(resource, startTime, endTime);
  const { creditsUsed, amountCharged } = settleBooking({
    amount, creditsNeeded, memberCredits: member.credits,
  });

  // Fetch user's Google Calendar refresh token (if connected)
  const userRow = await prisma.user.findUnique({
    where: { id: user.id },
    select: { googleCalendarRefreshToken: true },
  });

  const booking = await prisma.$transaction(async (tx) => {
    if (creditsUsed > 0) {
      await tx.member.update({ where: { id: member.id }, data: { credits: { decrement: creditsUsed } } });
    }
    return tx.booking.create({
      data: {
        organizationId: member.organizationId,
        resourceId,
        memberId: member.id,
        userId: user.id,
        title: title ?? null,
        startTime,
        endTime,
        attendees,
        status: resource.requiresApproval ? "PENDING" : "CONFIRMED",
        amountCharged,
        creditsUsed,
      },
      include: {
        resource: {
          select: {
            id: true, name: true, type: true,
            location: { select: { id: true, name: true } },
          },
        },
        organization: { select: { name: true, currency: true, timezone: true } },
      },
    });
  });

  // Google Calendar event (fire-and-forget, only for CONFIRMED bookings)
  if (userRow?.googleCalendarRefreshToken && booking.status === "CONFIRMED") {
    void createCalendarEvent(userRow.googleCalendarRefreshToken, {
      title: booking.title ?? booking.resource.name,
      startTime: booking.startTime,
      endTime: booking.endTime,
      timezone: booking.organization.timezone,
      resourceName: booking.resource.name,
      orgName: booking.organization.name,
    }).then((eventId) => {
      if (eventId) {
        return prisma.booking.update({
          where: { id: booking.id },
          data: { googleCalendarEventId: eventId },
        });
      }
    });
  }

  // Confirmation email to the member (fire-and-forget)
  if (user.email) {
    void sendBookingConfirmation({
      to: user.email,
      memberName: user.user_metadata?.name ?? null,
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
