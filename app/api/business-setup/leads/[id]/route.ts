import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { requireBusinessSetup } from "@/lib/business-setup/access";
import { stageLabel } from "@/lib/business-setup/meta";
import { z } from "zod";

const serializeMoney = (v: any) => (v == null ? null : Number(v));

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireBusinessSetup();
  if (!auth) return apiError("Forbidden", 403);

  const lead = await prisma.businessSetupLead.findFirst({
    where: { id: params.id, organizationId: auth.organizationId, deletedAt: null },
    include: {
      activities: { orderBy: { createdAt: "desc" } },
      proposal: true,
      application: true,
    },
  });
  if (!lead) return apiError("Lead not found", 404);

  return apiSuccess({
    ...lead,
    estimatedFee: serializeMoney(lead.estimatedFee),
    quotedFee: serializeMoney(lead.quotedFee),
    proposal: lead.proposal
      ? { ...lead.proposal, subtotal: serializeMoney(lead.proposal.subtotal), totalFee: serializeMoney(lead.proposal.totalFee) }
      : null,
  });
}

const updateSchema = z.object({
  action: z.enum(["update", "convert"]).default("update"),
  stage: z.enum([
    "NEW_ENQUIRY", "QUALIFIED", "PROPOSAL_SENT", "DOCUMENTS_COLLECTION",
    "SUBMITTED_TO_AUTHORITY", "AWAITING_APPROVAL", "APPROVED", "COMPLETED", "LOST",
  ]).optional(),
  lostReason: z.string().max(500).optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assignedTo: z.string().optional().nullable(),
  quotedFee: z.number().min(0).optional().nullable(),
  estimatedFee: z.number().min(0).optional().nullable(),
  expectedCloseDate: z.coerce.date().optional().nullable(),
  clientName: z.string().min(1).max(160).optional(),
  clientPhone: z.string().max(30).optional(),
  clientEmail: z.string().email().optional().or(z.literal("")).nullable(),
  clientWhatsapp: z.string().max(30).optional().nullable(),
  companyName: z.string().max(200).optional().nullable(),
  businessActivity: z.array(z.string()).optional(),
  licenseCatalogId: z.string().cuid().optional().nullable(),
  freezoneName: z.string().max(120).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireBusinessSetup();
  if (!auth) return apiError("Forbidden", 403);

  const lead = await prisma.businessSetupLead.findFirst({
    where: { id: params.id, organizationId: auth.organizationId, deletedAt: null },
  });
  if (!lead) return apiError("Lead not found", 404);

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;

  // ── Convert to member ──────────────────────────────────────────────────────
  if (d.action === "convert") {
    if (lead.memberId) return apiError("This lead is already converted", 409);
    if (!lead.clientEmail) return apiError("Client email is required to convert to a member");

    const existing = await prisma.user.findFirst({
      where: { email: lead.clientEmail },
      include: { member: true, organizations: { where: { organizationId: auth.organizationId } } },
    });
    if (existing?.member && existing.organizations.length) {
      // Already a member — just link.
      await prisma.businessSetupLead.update({ where: { id: lead.id }, data: { memberId: existing.member.id } });
      return apiSuccess({ converted: true, memberId: existing.member.id });
    }

    const supabaseAdmin = createAdminClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    let { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
      type: "invite", email: lead.clientEmail, options: { data: { name: lead.clientName }, redirectTo: `${appUrl}/auth-callback` },
    }).catch(() => ({ data: null as any }));
    if (!linkData) {
      ({ data: linkData } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink", email: lead.clientEmail, options: { redirectTo: `${appUrl}/auth-callback` },
      }).catch(() => ({ data: null as any })));
    }
    const userId = linkData?.user?.id ?? crypto.randomUUID();

    const member = await prisma.$transaction(async (tx) => {
      const dbUser = await tx.user.upsert({
        where: { email: lead.clientEmail! },
        create: { id: userId, email: lead.clientEmail!, name: lead.clientName },
        update: { name: lead.clientName },
      });
      await tx.userOrganization.upsert({
        where: { userId_organizationId: { userId: dbUser.id, organizationId: auth.organizationId } },
        create: { userId: dbUser.id, organizationId: auth.organizationId, role: "MEMBER" },
        update: {},
      });
      const m = await tx.member.upsert({
        where: { userId: dbUser.id },
        create: {
          organizationId: auth.organizationId, userId: dbUser.id, status: "ACTIVE",
          company: lead.companyName, phone: lead.clientPhone, whatsAppNumber: lead.clientWhatsapp,
          nationality: lead.clientNationality,
        },
        update: {},
      });
      await tx.businessSetupLead.update({ where: { id: lead.id }, data: { memberId: m.id } });
      await tx.leadActivity.create({ data: { leadId: lead.id, userId: auth.userId, activityType: "NOTE", note: "Converted to member" } });
      return m;
    });

    return apiSuccess({ converted: true, memberId: member.id });
  }

  // ── Field updates ──────────────────────────────────────────────────────────
  const data: any = {};
  const map: (keyof typeof d)[] = [
    "priority", "clientName", "clientPhone", "companyName", "businessActivity", "freezoneName", "notes",
  ];
  for (const k of map) if (d[k] !== undefined) data[k] = d[k];
  if (d.assignedTo !== undefined) data.assignedTo = d.assignedTo || null;
  if (d.quotedFee !== undefined) data.quotedFee = d.quotedFee;
  if (d.estimatedFee !== undefined) data.estimatedFee = d.estimatedFee;
  if (d.expectedCloseDate !== undefined) data.expectedCloseDate = d.expectedCloseDate;
  if (d.clientEmail !== undefined) data.clientEmail = d.clientEmail || null;
  if (d.clientWhatsapp !== undefined) data.clientWhatsapp = d.clientWhatsapp || null;
  if (d.licenseCatalogId !== undefined) data.licenseCatalogId = d.licenseCatalogId || null;

  const activityNotes: { type: string; note: string }[] = [];

  // Stage transition
  if (d.stage && d.stage !== lead.stage) {
    data.stage = d.stage;
    if (d.stage === "COMPLETED") data.closedAt = new Date();
    if (d.stage === "LOST") { data.closedAt = new Date(); data.lostReason = d.lostReason ?? lead.lostReason; }
    activityNotes.push({ type: "STAGE_CHANGE", note: `Stage → ${stageLabel(d.stage)}` });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.businessSetupLead.update({ where: { id: lead.id }, data });
    for (const a of activityNotes) {
      await tx.leadActivity.create({ data: { leadId: lead.id, userId: auth.userId, activityType: a.type as any, note: a.note } });
    }
    return u;
  });

  return apiSuccess({ ...updated, estimatedFee: serializeMoney(updated.estimatedFee), quotedFee: serializeMoney(updated.quotedFee) });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireBusinessSetup();
  if (!auth) return apiError("Forbidden", 403);

  const lead = await prisma.businessSetupLead.findFirst({
    where: { id: params.id, organizationId: auth.organizationId, deletedAt: null },
  });
  if (!lead) return apiError("Lead not found", 404);

  await prisma.businessSetupLead.update({ where: { id: params.id }, data: { deletedAt: new Date() } });
  return apiSuccess({ success: true });
}
