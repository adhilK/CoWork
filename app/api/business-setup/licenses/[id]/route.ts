import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";
import { z } from "zod";

const updateSchema = z.object({
  authority: z.string().min(1).max(120).optional(),
  emirate: z.string().max(60).optional().nullable(),
  name: z.string().min(1).max(160).optional(),
  activityCategory: z.string().max(60).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  baseCost: z.number().min(0).optional().nullable(),
  govFees: z.number().min(0).optional().nullable(),
  visaQuota: z.number().int().min(0).max(999).optional().nullable(),
  officeType: z.string().max(60).optional().nullable(),
  minShareCapital: z.number().min(0).optional().nullable(),
  tenureYears: z.number().int().min(1).max(10).optional(),
  processingDays: z.number().int().min(0).max(365).optional().nullable(),
  features: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  isPopular: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);

  const item = await prisma.licenseCatalog.findFirst({
    where: { id: params.id, organizationId: auth.organizationId, deletedAt: null },
  });
  if (!item) return apiError("License not found", 404);

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");

  const updated = await prisma.licenseCatalog.update({ where: { id: params.id }, data: parsed.data });
  return apiSuccess(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);

  const item = await prisma.licenseCatalog.findFirst({
    where: { id: params.id, organizationId: auth.organizationId, deletedAt: null },
  });
  if (!item) return apiError("License not found", 404);

  await prisma.licenseCatalog.update({ where: { id: params.id }, data: { deletedAt: new Date(), isActive: false } });
  return apiSuccess({ success: true });
}
