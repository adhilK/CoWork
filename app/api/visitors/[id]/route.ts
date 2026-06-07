import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";

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

  const visitor = await prisma.visitor.findFirst({ where: { id: params.id, organizationId: orgId } });
  if (!visitor) return apiError("Visitor not found", 404);

  const body = await req.json();
  const data: any = {};

  if (body.action === "checkout") {
    data.checkedOutAt = new Date();
  } else {
    if (body.name !== undefined) data.name = body.name;
    if (body.email !== undefined) data.email = body.email;
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.purpose !== undefined) data.purpose = body.purpose;
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

  const visitor = await prisma.visitor.findFirst({ where: { id: params.id, organizationId: orgId } });
  if (!visitor) return apiError("Visitor not found", 404);

  await prisma.visitor.delete({ where: { id: params.id } });
  return apiSuccess({ success: true });
}
