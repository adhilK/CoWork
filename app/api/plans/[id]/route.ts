import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";

// Admin-only endpoint.
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

  const plan = await prisma.membershipPlan.findFirst({ where: { id: params.id, organizationId: orgId } });
  if (!plan) return apiError("Plan not found", 404);

  const body = await req.json();
  const updated = await prisma.membershipPlan.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.price !== undefined && { price: body.price }),
      ...(body.billingCycle !== undefined && { billingCycle: body.billingCycle }),
      ...(body.includedCredits !== undefined && { includedCredits: body.includedCredits }),
      ...(body.meetingRoomHours !== undefined && { meetingRoomHours: body.meetingRoomHours }),
      ...(body.features !== undefined && { features: body.features }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
    include: { _count: { select: { members: true } } },
  });
  return apiSuccess(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);
  const orgId = await getOrgId(user.id);
  if (!orgId) return apiError("No organization", 403);

  const plan = await prisma.membershipPlan.findFirst({ where: { id: params.id, organizationId: orgId } });
  if (!plan) return apiError("Plan not found", 404);

  const memberCount = await prisma.member.count({ where: { membershipPlanId: params.id } });
  if (memberCount > 0) return apiError(`Cannot delete — ${memberCount} member(s) are on this plan`, 400);

  await prisma.membershipPlan.delete({ where: { id: params.id } });
  return apiSuccess({ success: true });
}
