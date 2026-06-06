import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";

async function getOrgId(userId: string) {
  const uo = await prisma.userOrganization.findFirst({ where: { userId }, select: { organizationId: true } });
  return uo?.organizationId ?? null;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);
  const orgId = await getOrgId(user.id);
  if (!orgId) return apiError("No organization", 403);

  const a = await prisma.announcement.findFirst({ where: { id: params.id, organizationId: orgId } });
  if (!a) return apiError("Not found", 404);

  const body = await req.json();
  const updated = await prisma.announcement.update({
    where: { id: params.id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.body !== undefined && { body: body.body }),
      ...(body.isPinned !== undefined && { isPinned: body.isPinned }),
    },
  });
  return apiSuccess(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);
  const orgId = await getOrgId(user.id);
  if (!orgId) return apiError("No organization", 403);

  const a = await prisma.announcement.findFirst({ where: { id: params.id, organizationId: orgId } });
  if (!a) return apiError("Not found", 404);

  await prisma.announcement.delete({ where: { id: params.id } });
  return apiSuccess({ success: true });
}
