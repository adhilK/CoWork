import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { requirePartners, computeCommission } from "@/lib/partners";
import { z } from "zod";

const serialize = (r: any) => ({
  ...r,
  dealValue: r.dealValue == null ? null : Number(r.dealValue),
  commissionAmount: r.commissionAmount == null ? null : Number(r.commissionAmount),
});

const updateSchema = z.object({
  action: z.enum(["update", "convert", "pay", "cancel", "reopen"]).default("update"),
  clientName: z.string().min(1).max(160).optional(),
  clientPhone: z.string().max(30).optional().nullable(),
  clientEmail: z.string().email().optional().or(z.literal("")).nullable(),
  serviceDescription: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  // convert
  dealValue: z.number().min(0).optional().nullable(),
  commissionAmount: z.number().min(0).optional().nullable(),
  // pay
  payoutReference: z.string().max(120).optional().nullable(),
  cancelReason: z.string().max(500).optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePartners();
  if (!auth) return apiError("Forbidden", 403);

  const referral = await prisma.referral.findFirst({
    where: { id: params.id, organizationId: auth.organizationId, deletedAt: null },
    include: { partner: { select: { commissionType: true, commissionRate: true } } },
  });
  if (!referral) return apiError("Referral not found", 404);

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;

  const data: any = {};
  if (d.clientName !== undefined) data.clientName = d.clientName;
  if (d.clientPhone !== undefined) data.clientPhone = d.clientPhone || null;
  if (d.clientEmail !== undefined) data.clientEmail = d.clientEmail || null;
  if (d.serviceDescription !== undefined) data.serviceDescription = d.serviceDescription;
  if (d.notes !== undefined) data.notes = d.notes;

  if (d.action === "convert") {
    const dealValue = d.dealValue ?? (referral.dealValue == null ? null : Number(referral.dealValue));
    const commission = d.commissionAmount ?? computeCommission(
      referral.partner.commissionType,
      Number(referral.partner.commissionRate),
      dealValue,
    );
    data.status = "CONVERTED";
    data.dealValue = dealValue;
    data.commissionAmount = commission;
    data.convertedAt = referral.convertedAt ?? new Date();
  } else if (d.action === "pay") {
    if (referral.status !== "CONVERTED") return apiError("Only converted referrals can be paid");
    data.status = "PAID";
    data.paidAt = new Date();
    data.payoutReference = d.payoutReference ?? null;
  } else if (d.action === "cancel") {
    data.status = "CANCELLED";
    if (d.cancelReason) data.notes = d.cancelReason;
  } else if (d.action === "reopen") {
    data.status = "PENDING";
    data.convertedAt = null;
    data.paidAt = null;
  }

  const updated = await prisma.referral.update({
    where: { id: params.id },
    data,
    include: { partner: { select: { name: true, companyName: true } } },
  });

  return apiSuccess(serialize(updated));
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePartners();
  if (!auth) return apiError("Forbidden", 403);

  const referral = await prisma.referral.findFirst({
    where: { id: params.id, organizationId: auth.organizationId, deletedAt: null },
  });
  if (!referral) return apiError("Referral not found", 404);

  await prisma.referral.update({ where: { id: params.id }, data: { deletedAt: new Date() } });
  return apiSuccess({ success: true });
}
