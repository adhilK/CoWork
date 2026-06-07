import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiAuth } from "@/lib/auth";
import { updateBookingSchema } from "@/lib/validations";
import { checkinUrl } from "@/lib/checkin-token";
import { getBaseUrl, apiError, apiSuccess } from "@/lib/utils";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getApiAuth();
  if (!auth) return apiError("Unauthorized", 401);

  const booking = await prisma.booking.findFirst({
    where: { id: params.id, organizationId: auth.organizationId, deletedAt: null },
    include: { resource: true, member: { include: { user: true } } },
  });
  if (!booking) return apiError("Not found", 404);

  // Include the signed QR check-in URL so the dialog can render it
  return apiSuccess({ ...booking, checkinUrl: checkinUrl(booking.id, getBaseUrl()) });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getApiAuth();
  if (!auth) return apiError("Unauthorized", 401);
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
    where: { id: params.id, organizationId: orgId, deletedAt: null },
  });
  if (!booking) return apiError("Not found", 404);

  // ?series=true → cancel all future bookings in the same recurring group
  const cancelSeries = req.nextUrl.searchParams.get("series") === "true";

  if (cancelSeries && booking.recurringGroupId) {
    await prisma.booking.updateMany({
      where: {
        recurringGroupId: booking.recurringGroupId,
        organizationId: orgId,
        deletedAt: null,
        startTime: { gte: booking.startTime }, // only this + future
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      data: { status: "CANCELLED", cancelledAt: new Date(), deletedAt: new Date() },
    });
    return apiSuccess({ success: true, cancelled: "series" });
  }

  // Single cancellation
  await prisma.booking.update({
    where: { id: params.id },
    data: { status: "CANCELLED", cancelledAt: new Date(), deletedAt: new Date() },
  });

  return apiSuccess({ success: true, cancelled: "single" });
}
