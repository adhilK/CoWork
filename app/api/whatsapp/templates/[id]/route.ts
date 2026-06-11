import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";
import { z } from "zod";

const updateTemplateSchema = z.object({
  category: z.enum(["UTILITY", "MARKETING", "AUTHENTICATION"]).optional(),
  language: z.string().min(2).max(10).optional(),
  body: z.string().min(1).max(1024).optional(),
  variables: z.array(z.string()).optional(),
  status: z.enum(["DRAFT", "PENDING", "APPROVED", "REJECTED"]).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);

  const template = await prisma.whatsAppTemplate.findFirst({
    where: { id: params.id, organizationId: auth.organizationId, deletedAt: null },
  });
  if (!template) return apiError("Template not found", 404);

  const body = await req.json();
  const parsed = updateTemplateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");

  const updated = await prisma.whatsAppTemplate.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return apiSuccess(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);

  const template = await prisma.whatsAppTemplate.findFirst({
    where: { id: params.id, organizationId: auth.organizationId, deletedAt: null },
  });
  if (!template) return apiError("Template not found", 404);

  await prisma.whatsAppTemplate.update({
    where: { id: params.id },
    data: { deletedAt: new Date(), isActive: false },
  });

  return apiSuccess({ success: true });
}
