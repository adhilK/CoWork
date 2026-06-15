import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);
  const orgId = auth.organizationId;

  const booking = await prisma.booking.findFirst({
    where: { id: params.id, organizationId: orgId, deletedAt: null },
  });
  if (!booking) return apiError("Booking not found", 404);
  if (booking.status !== "CONFIRMED" && booking.status !== "PENDING") {
    return apiError(`Booking cannot be checked in (status: ${booking.status})`, 400);
  }

  // Check-in is only valid within the booking window (from 15 minutes before
  // start until the booking ends).
  const now = Date.now();
  const EARLY_GRACE_MS = 15 * 60 * 1000;
  if (now < booking.startTime.getTime() - EARLY_GRACE_MS) {
    return apiError("Check-in opens 15 minutes before the booking start time", 422);
  }
  if (now > booking.endTime.getTime()) {
    return apiError("This booking has already ended — check-in is closed", 422);
  }

  const updated = await prisma.booking.update({
    where: { id: params.id },
    data: { status: "CHECKED_IN", checkedInAt: new Date() },
    include: { resource: { select: { id: true, name: true, type: true } }, member: { include: { user: { select: { name: true, email: true } } } } },
  });
  return apiSuccess(updated);
}
