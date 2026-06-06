import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { updateResourceSchema } from "@/lib/validations";
import { apiError, apiSuccess } from "@/lib/utils";

async function getOrgId(userId: string) {
  const uo = await prisma.userOrganization.findFirst({ where: { userId }, select: { organizationId: true } });
  return uo?.organizationId ?? null;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);
  const orgId = await getOrgId(user.id);
  const resource = await prisma.resource.findFirst({
    where: { id: params.id, organizationId: orgId ?? "", deletedAt: null },
    include: { location: true },
  });
  if (!resource) return apiError("Not found", 404);
  return apiSuccess(resource);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);
  const orgId = await getOrgId(user.id);
  const resource = await prisma.resource.findFirst({ where: { id: params.id, organizationId: orgId ?? "" } });
  if (!resource) return apiError("Not found", 404);
  const body = await req.json();
  const parsed = updateResourceSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
  const updated = await prisma.resource.update({ where: { id: params.id }, data: parsed.data, include: { location: true } });
  return apiSuccess(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);
  const orgId = await getOrgId(user.id);
  const resource = await prisma.resource.findFirst({ where: { id: params.id, organizationId: orgId ?? "" } });
  if (!resource) return apiError("Not found", 404);
  await prisma.resource.update({ where: { id: params.id }, data: { deletedAt: new Date(), isActive: false } });
  return apiSuccess({ success: true });
}
