import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiAuth, requireAdminApi } from "@/lib/auth";
import { createResourceSchema } from "@/lib/validations";
import { apiError, apiSuccess } from "@/lib/utils";

// GET is shared: members browse bookable resources from the portal.
export async function GET(_req: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return apiError("Unauthorized", 401);

  const resources = await prisma.resource.findMany({
    where: { organizationId: auth.organizationId, deletedAt: null },
    include: { location: true },
    orderBy: { name: "asc" },
  });
  return apiSuccess(resources);
}

// Creating resources is admin-only.
export async function POST(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);
  const orgId = auth.organizationId;

  const body = await req.json();
  const parsed = createResourceSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");

  const resource = await prisma.resource.create({
    data: { organizationId: orgId, ...parsed.data },
    include: { location: true },
  });
  return apiSuccess(resource, 201);
}
