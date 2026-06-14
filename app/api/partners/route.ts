import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { requirePartners, PARTNER_TYPES } from "@/lib/partners";
import { encryptField } from "@/lib/encryption";
import { z } from "zod";

export async function GET(_req: NextRequest) {
  const auth = await requirePartners();
  if (!auth) return apiError("Forbidden", 403);

  const partners = await prisma.partner.findMany({
    where: { organizationId: auth.organizationId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: { referrals: { where: { deletedAt: null }, select: { status: true, commissionAmount: true } } },
  });

  return apiSuccess({
    data: partners.map((p) => {
      const refs = p.referrals;
      const earned = refs.filter((r) => r.status === "CONVERTED" || r.status === "PAID").reduce((s, r) => s + Number(r.commissionAmount ?? 0), 0);
      const paid = refs.filter((r) => r.status === "PAID").reduce((s, r) => s + Number(r.commissionAmount ?? 0), 0);
      const { referrals, payoutDetails, ...rest } = p;
      return {
        ...rest,
        commissionRate: Number(p.commissionRate),
        hasPayoutDetails: !!payoutDetails,
        referralCount: refs.length,
        commissionEarned: earned,
        commissionPaid: paid,
        commissionOutstanding: earned - paid,
      };
    }),
  });
}

const createSchema = z.object({
  name: z.string().min(1).max(160),
  companyName: z.string().max(160).optional().nullable(),
  type: z.enum(PARTNER_TYPES).default("INDIVIDUAL"),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().max(30).optional().nullable(),
  whatsapp: z.string().max(30).optional().nullable(),
  commissionType: z.enum(["PERCENTAGE", "FIXED"]).default("PERCENTAGE"),
  commissionRate: z.number().min(0).max(1000000),
  currency: z.string().length(3).default("AED"),
  payoutDetails: z.string().max(300).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  isActive: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const auth = await requirePartners();
  if (!auth) return apiError("Forbidden", 403);

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;

  const partner = await prisma.partner.create({
    data: {
      organizationId: auth.organizationId,
      name: d.name,
      companyName: d.companyName ?? null,
      type: d.type,
      email: d.email || null,
      phone: d.phone ?? null,
      whatsapp: d.whatsapp ?? null,
      commissionType: d.commissionType,
      commissionRate: d.commissionRate,
      currency: d.currency,
      payoutDetails: encryptField(d.payoutDetails ?? null),
      notes: d.notes ?? null,
      isActive: d.isActive,
    },
  });

  return apiSuccess({ ...partner, commissionRate: Number(partner.commissionRate) }, 201);
}
