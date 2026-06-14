import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { requirePartners, PARTNER_TYPES } from "@/lib/partners";
import { encryptField, decryptField } from "@/lib/encryption";
import { z } from "zod";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePartners();
  if (!auth) return apiError("Forbidden", 403);

  const partner = await prisma.partner.findFirst({
    where: { id: params.id, organizationId: auth.organizationId, deletedAt: null },
  });
  if (!partner) return apiError("Partner not found", 404);

  return apiSuccess({
    ...partner,
    commissionRate: Number(partner.commissionRate),
    payoutDetails: decryptField(partner.payoutDetails),
  });
}

const updateSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  companyName: z.string().max(160).optional().nullable(),
  type: z.enum(PARTNER_TYPES).optional(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().max(30).optional().nullable(),
  whatsapp: z.string().max(30).optional().nullable(),
  commissionType: z.enum(["PERCENTAGE", "FIXED"]).optional(),
  commissionRate: z.number().min(0).max(1000000).optional(),
  currency: z.string().length(3).optional(),
  payoutDetails: z.string().max(300).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePartners();
  if (!auth) return apiError("Forbidden", 403);

  const partner = await prisma.partner.findFirst({
    where: { id: params.id, organizationId: auth.organizationId, deletedAt: null },
  });
  if (!partner) return apiError("Partner not found", 404);

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;

  const data: any = { ...d };
  if (d.email !== undefined) data.email = d.email || null;
  if (d.payoutDetails !== undefined) data.payoutDetails = encryptField(d.payoutDetails || null);

  const updated = await prisma.partner.update({ where: { id: params.id }, data });
  return apiSuccess({ ...updated, commissionRate: Number(updated.commissionRate), payoutDetails: undefined });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePartners();
  if (!auth) return apiError("Forbidden", 403);

  const partner = await prisma.partner.findFirst({
    where: { id: params.id, organizationId: auth.organizationId, deletedAt: null },
  });
  if (!partner) return apiError("Partner not found", 404);

  await prisma.partner.update({ where: { id: params.id }, data: { deletedAt: new Date(), isActive: false } });
  return apiSuccess({ success: true });
}
