import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { encryptField } from "@/lib/encryption";

// Admin-only endpoint: members must never reach visitor data.
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

  const visitor = await prisma.visitor.findFirst({ where: { id: params.id, organizationId: orgId, deletedAt: null } });
  if (!visitor) return apiError("Visitor not found", 404);

  const body = await req.json();
  const data: any = {};

  if (body.action === "checkout") {
    data.checkedOutAt = new Date();
  } else if (body.action === "checkin") {
    data.checkedInAt = new Date();
    data.checkedOutAt = null;
  } else {
    if (body.name !== undefined) data.name = body.name;
    if (body.email !== undefined) data.email = body.email || null;
    if (body.phone !== undefined) data.phone = body.phone || null;
    if (body.company !== undefined) data.company = body.company || null;
    if (body.purpose !== undefined) data.purpose = body.purpose || null;
    if (body.nationality !== undefined) data.nationality = body.nationality || null;
    if (body.idType !== undefined) data.idType = body.idType || null;
    if (body.idNumber !== undefined) data.idNumber = encryptField(body.idNumber || null);
    if (body.vehiclePlate !== undefined) data.vehiclePlate = body.vehiclePlate || null;
    // Blacklist toggle
    if (body.isBlacklisted !== undefined) {
      data.isBlacklisted = !!body.isBlacklisted;
      data.blacklistReason = body.isBlacklisted ? (body.blacklistReason || null) : null;
    }
  }

  const updated = await prisma.visitor.update({ where: { id: params.id }, data });
  return apiSuccess(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const orgId = await getOrgId(user.id);
  if (!orgId) return apiError("No organization", 403);

  const visitor = await prisma.visitor.findFirst({ where: { id: params.id, organizationId: orgId, deletedAt: null } });
  if (!visitor) return apiError("Visitor not found", 404);

  // Soft delete (per conventions) — keeps the audit trail.
  await prisma.visitor.update({ where: { id: params.id }, data: { deletedAt: new Date() } });
  return apiSuccess({ success: true });
}
