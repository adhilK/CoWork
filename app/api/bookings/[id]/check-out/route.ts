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
  if (booking.status !== "CHECKED_IN") {
    return apiError(`Booking is not checked in (status: ${booking.status})`, 400);
  }

  const updated = await prisma.booking.update({
    where: { id: params.id },
    data: { status: "COMPLETED", checkedOutAt: new Date() },
    include: { resource: { select: { id: true, name: true, type: true } }, member: { include: { user: { select: { name: true, email: true } } } } },
  });
  return apiSuccess(updated);
}
