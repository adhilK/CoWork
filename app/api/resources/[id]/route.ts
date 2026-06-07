import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiAuth, requireAdminApi } from "@/lib/auth";
import { updateResourceSchema } from "@/lib/validations";
import { apiError, apiSuccess } from "@/lib/utils";

// GET is shared: members may view resource details when booking.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getApiAuth();
  if (!auth) return apiError("Unauthorized", 401);
  const resource = await prisma.resource.findFirst({
    where: { id: params.id, organizationId: auth.organizationId, deletedAt: null },
    include: { location: true },
  });
  if (!resource) return apiError("Not found", 404);
  return apiSuccess(resource);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);
  const resource = await prisma.resource.findFirst({ where: { id: params.id, organizationId: auth.organizationId } });
  if (!resource) return apiError("Not found", 404);
  const body = await req.json();
  const parsed = updateResourceSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
  const updated = await prisma.resource.update({ where: { id: params.id }, data: parsed.data, include: { location: true } });
  return apiSuccess(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);
  const resource = await prisma.resource.findFirst({ where: { id: params.id, organizationId: auth.organizationId } });
  if (!resource) return apiError("Not found", 404);
  await prisma.resource.update({ where: { id: params.id }, data: { deletedAt: new Date(), isActive: false } });
  return apiSuccess({ success: true });
}
