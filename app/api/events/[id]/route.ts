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

  const ev = await prisma.event.findFirst({ where: { id: params.id, organizationId: orgId } });
  if (!ev) return apiError("Not found", 404);

  const body = await req.json();
  const updated = await prisma.event.update({
    where: { id: params.id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.startTime !== undefined && { startTime: new Date(body.startTime) }),
      ...(body.endTime !== undefined && { endTime: new Date(body.endTime) }),
      ...(body.location !== undefined && { location: body.location }),
      ...(body.capacity !== undefined && { capacity: body.capacity }),
      ...(body.isPublic !== undefined && { isPublic: body.isPublic }),
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

  const ev = await prisma.event.findFirst({ where: { id: params.id, organizationId: orgId } });
  if (!ev) return apiError("Not found", 404);

  await prisma.event.delete({ where: { id: params.id } });
  return apiSuccess({ success: true });
}
