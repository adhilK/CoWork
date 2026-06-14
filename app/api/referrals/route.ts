import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { requirePartners } from "@/lib/partners";
import { z } from "zod";

const serialize = (r: any) => ({
  ...r,
  dealValue: r.dealValue == null ? null : Number(r.dealValue),
  commissionAmount: r.commissionAmount == null ? null : Number(r.commissionAmount),
});

export async function GET(req: NextRequest) {
  const auth = await requirePartners();
  if (!auth) return apiError("Forbidden", 403);

  const sp = req.nextUrl.searchParams;
  const where: any = { organizationId: auth.organizationId, deletedAt: null };
  const partnerId = sp.get("partnerId");
  const status = sp.get("status");
  if (partnerId) where.partnerId = partnerId;
  if (status) where.status = status;

  const referrals = await prisma.referral.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { partner: { select: { name: true, companyName: true } } },
  });

  return apiSuccess({ data: referrals.map(serialize) });
}

const createSchema = z.object({
  partnerId: z.string().cuid(),
  clientName: z.string().min(1).max(160),
  clientPhone: z.string().max(30).optional().nullable(),
  clientEmail: z.string().email().optional().or(z.literal("")).nullable(),
  serviceDescription: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  // Optionally spin up a Business Setup lead from this referral.
  createLead: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const auth = await requirePartners();
  if (!auth) return apiError("Forbidden", 403);

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;

  const partner = await prisma.partner.findFirst({
    where: { id: d.partnerId, organizationId: auth.organizationId, deletedAt: null },
  });
  if (!partner) return apiError("Partner not found", 404);

  // Optionally create a linked CRM lead.
  let leadId: string | null = null;
  if (d.createLead) {
    const lead = await prisma.businessSetupLead.create({
      data: {
        organizationId: auth.organizationId,
        clientName: d.clientName,
        clientPhone: d.clientPhone || "N/A",
        clientEmail: d.clientEmail || null,
        clientWhatsapp: d.clientPhone || null,
        jurisdiction: "UAE",
        licenseType: "UAE_FREEZONE",
        source: `Referral — ${partner.name}`,
        assignedTo: auth.userId,
        activities: { create: { userId: auth.userId, activityType: "NOTE", note: `Lead from partner referral (${partner.name})` } },
      },
    });
    leadId = lead.id;
  }

  const referral = await prisma.referral.create({
    data: {
      organizationId: auth.organizationId,
      partnerId: d.partnerId,
      clientName: d.clientName,
      clientPhone: d.clientPhone ?? null,
      clientEmail: d.clientEmail || null,
      serviceDescription: d.serviceDescription ?? null,
      notes: d.notes ?? null,
      currency: partner.currency,
      leadId,
    },
    include: { partner: { select: { name: true, companyName: true } } },
  });

  return apiSuccess(serialize(referral), 201);
}
