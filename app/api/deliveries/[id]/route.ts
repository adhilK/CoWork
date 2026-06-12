import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";

async function getOrgId(userId: string) {
  const uo = await prisma.userOrganization.findFirst({ where: { userId }, select: { organizationId: true, role: true } });
  if (!uo || uo.role === "MEMBER") return null;
  return uo.organizationId;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);
  const orgId = await getOrgId(user.id);
  if (!orgId) return apiError("No organization", 403);

  const delivery = await prisma.delivery.findFirst({ where: { id: params.id, organizationId: orgId, deletedAt: null } });
  if (!delivery) return apiError("Delivery not found", 404);

  const body = await req.json();
  const data: any = {};

  if (body.action === "collect") {
    data.collectedAt = new Date();
    data.collectedBy = body.collectedBy || null;
  } else {
    if (body.courierName !== undefined) data.courierName = body.courierName || null;
    if (body.trackingNumber !== undefined) data.trackingNumber = body.trackingNumber || null;
    if (body.description !== undefined) data.description = body.description || null;
    if (body.collectedBy !== undefined) data.collectedBy = body.collectedBy || null;
  }

  const updated = await prisma.delivery.update({
    where: { id: params.id },
    data,
    include: { member: { include: { user: { select: { name: true, email: true } } } } },
  });
  return apiSuccess(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);
  const orgId = await getOrgId(user.id);
  if (!orgId) return apiError("No organization", 403);

  const delivery = await prisma.delivery.findFirst({ where: { id: params.id, organizationId: orgId, deletedAt: null } });
  if (!delivery) return apiError("Delivery not found", 404);

  await prisma.delivery.update({ where: { id: params.id }, data: { deletedAt: new Date() } });
  return apiSuccess({ success: true });
}
