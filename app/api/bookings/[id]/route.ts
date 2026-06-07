import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiAuth } from "@/lib/auth";
import { updateBookingSchema } from "@/lib/validations";
import { checkinUrl } from "@/lib/checkin-token";
import { getBaseUrl, apiError, apiSuccess } from "@/lib/utils";
import { deleteCalendarEvent } from "@/lib/google-calendar";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getApiAuth();
  if (!auth) return apiError("Unauthorized", 401);

  const booking = await prisma.booking.findFirst({
    where: {
      id: params.id,
      organizationId: auth.organizationId,
      deletedAt: null,
      // Members may only read their own bookings; admins/owners read any.
      ...(auth.role === "MEMBER" && { userId: auth.userId }),
    },
    include: { resource: true, member: { include: { user: true } } },
  });
  if (!booking) return apiError("Not found", 404);

  // Include the signed QR check-in URL so the dialog can render it
  return apiSuccess({ ...booking, checkinUrl: checkinUrl(booking.id, getBaseUrl()) });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getApiAuth();
  if (!auth) return apiError("Unauthorized", 401);
  // Editing booking details (time, resource, status) is an admin action.
  if (auth.role === "MEMBER") return apiError("Forbidden", 403);
  const orgId = auth.organizationId;

  const booking = await prisma.booking.findFirst({
    where: { id: params.id, organizationId: orgId, deletedAt: null },
  });
  if (!booking) return apiError("Not found", 404);

  const body = await req.json();
  const parsed = updateBookingSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");

  const { startTime, endTime, resourceId, ...rest } = parsed.data;

  // Overlap check if times changed
  if (startTime && endTime) {
    const conflict = await prisma.booking.findFirst({
      where: {
        resourceId: resourceId ?? booking.resourceId,
        deletedAt: null,
        id: { not: params.id },
        status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
        AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
      },
    });
    if (conflict) return apiError("Time slot conflict with another booking", 409);
  }

  const updated = await prisma.booking.update({
    where: { id: params.id },
    data: { ...rest, ...(startTime && { startTime }), ...(endTime && { endTime }), ...(resourceId && { resourceId }) },
    include: { resource: true, member: { include: { user: true } } },
  });

  return apiSuccess(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getApiAuth();
  if (!auth) return apiError("Unauthorized", 401);
  const orgId = auth.organizationId;

  const booking = await prisma.booking.findFirst({
    where: {
      id: params.id,
      organizationId: orgId,
      deletedAt: null,
      // Members may only cancel their own bookings; admins/owners cancel any.
      ...(auth.role === "MEMBER" && { userId: auth.userId }),
    },
    select: {
      id: true, recurringGroupId: true, startTime: true,
      googleCalendarEventId: true, userId: true,
    },
  });
  if (!booking) return apiError("Not found", 404);

  // For series cancellation, members are scoped to their own bookings only.
  const memberScope = auth.role === "MEMBER" ? { userId: auth.userId } : {};

  // Helper: delete calendar event for a booking if the user has one connected
  async function maybeDeleteCalendarEvent(bookingId: string, userId: string, eventId: string | null) {
    if (!eventId) return;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { googleCalendarRefreshToken: true },
    });
    if (user?.googleCalendarRefreshToken) {
      void deleteCalendarEvent(user.googleCalendarRefreshToken, eventId);
    }
  }

  // ?series=true → cancel all future bookings in the same recurring group
  const cancelSeries = req.nextUrl.searchParams.get("series") === "true";

  if (cancelSeries && booking.recurringGroupId) {
    // Fetch all future bookings in the series to delete their calendar events
    const seriesBookings = await prisma.booking.findMany({
      where: {
        recurringGroupId: booking.recurringGroupId,
        organizationId: orgId,
        deletedAt: null,
        startTime: { gte: booking.startTime },
        status: { in: ["PENDING", "CONFIRMED"] },
        ...memberScope,
      },
      select: { id: true, userId: true, googleCalendarEventId: true },
    });

    await prisma.booking.updateMany({
      where: {
        recurringGroupId: booking.recurringGroupId,
        organizationId: orgId,
        deletedAt: null,
        startTime: { gte: booking.startTime },
        status: { in: ["PENDING", "CONFIRMED"] },
        ...memberScope,
      },
      data: { status: "CANCELLED", cancelledAt: new Date(), deletedAt: new Date() },
    });

    // Delete calendar events for all cancelled bookings (fire-and-forget)
    for (const b of seriesBookings) {
      void maybeDeleteCalendarEvent(b.id, b.userId, b.googleCalendarEventId);
    }

    return apiSuccess({ success: true, cancelled: "series" });
  }

  // Single cancellation
  await prisma.booking.update({
    where: { id: params.id },
    data: { status: "CANCELLED", cancelledAt: new Date(), deletedAt: new Date() },
  });

  // Delete calendar event (fire-and-forget)
  void maybeDeleteCalendarEvent(params.id, booking.userId, booking.googleCalendarEventId);

  return apiSuccess({ success: true, cancelled: "single" });
}
