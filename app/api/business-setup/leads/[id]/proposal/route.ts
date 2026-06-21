import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { requireBusinessSetup } from "@/lib/business-setup/access";
import { dispatchWhatsAppText } from "@/lib/jobs";
import { formatCurrency } from "@/lib/utils";
import { nanoid } from "nanoid";
import { z } from "zod";

const lineItemSchema = z.object({
  service: z.string().min(1).max(160),
  description: z.string().max(500).optional().nullable(),
  fee: z.number().min(0),
});

const upsertSchema = z.object({
  lineItems: z.array(lineItemSchema).min(1),
  validUntil: z.coerce.date(),
  notes: z.string().max(1000).optional().nullable(),
});

const serialize = (p: any) => ({
  ...p,
  subtotal: Number(p.subtotal),
  totalFee: Number(p.totalFee),
});

// Create or replace the proposal (kept in DRAFT until sent).
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireBusinessSetup();
  if (!auth) return apiError("Forbidden", 403);

  const lead = await prisma.businessSetupLead.findFirst({
    where: { id: params.id, organizationId: auth.organizationId, deletedAt: null },
  });
  if (!lead) return apiError("Lead not found", 404);

  const body = await req.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;

  const subtotal = d.lineItems.reduce((s, li) => s + li.fee, 0);

  const proposal = await prisma.businessSetupProposal.upsert({
    where: { leadId: lead.id },
    create: {
      leadId: lead.id, organizationId: auth.organizationId,
      lineItems: d.lineItems as any, subtotal, totalFee: subtotal,
      currency: lead.currency, validUntil: d.validUntil, notes: d.notes ?? null, status: "DRAFT",
    },
    update: {
      lineItems: d.lineItems as any, subtotal, totalFee: subtotal,
      validUntil: d.validUntil, notes: d.notes ?? null,
    },
  });

  // Keep the lead's quoted fee in sync.
  await prisma.businessSetupLead.update({ where: { id: lead.id }, data: { quotedFee: subtotal } });

  return apiSuccess(serialize(proposal));
}

const actionSchema = z.object({ action: z.enum(["send", "accept", "reject"]) });

// Send / accept / reject the proposal.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireBusinessSetup();
  if (!auth) return apiError("Forbidden", 403);

  const lead = await prisma.businessSetupLead.findFirst({
    where: { id: params.id, organizationId: auth.organizationId, deletedAt: null },
    include: { proposal: true },
  });
  if (!lead) return apiError("Lead not found", 404);
  if (!lead.proposal) return apiError("No proposal to update", 404);

  const body = await req.json();
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return apiError("Invalid action");
  const { action } = parsed.data;

  const data: any = {};
  if (action === "send") {
    data.status = "SENT";
    data.sentAt = new Date();
    // Generate a public token if one doesn't already exist.
    if (!lead.proposal.publicToken) {
      data.publicToken = nanoid(32);
      data.publicTokenExpiresAt = lead.proposal.validUntil;
    }
  }
  if (action === "accept") { data.status = "ACCEPTED"; data.acceptedAt = new Date(); }
  if (action === "reject") { data.status = "REJECTED"; }

  const updated = await prisma.$transaction(async (tx) => {
    const p = await tx.businessSetupProposal.update({ where: { leadId: lead.id }, data });
    if (action === "send") {
      // Advance the pipeline + log
      if (lead.stage === "NEW_ENQUIRY" || lead.stage === "QUALIFIED") {
        await tx.businessSetupLead.update({ where: { id: lead.id }, data: { stage: "PROPOSAL_SENT" } });
      }
      await tx.leadActivity.create({
        data: { leadId: lead.id, userId: auth.userId, activityType: "PROPOSAL_SENT", note: `Proposal sent — ${formatCurrency(Number(p.totalFee), p.currency)}` },
      });
    }
    if (action === "accept") {
      await tx.leadActivity.create({ data: { leadId: lead.id, userId: auth.userId, activityType: "NOTE", note: "Proposal accepted by client" } });
    }
    return p;
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const proposalToken = updated.publicToken ?? lead.proposal.publicToken;
  const proposalLink = proposalToken ? `${appUrl}/proposals/${proposalToken}` : null;

  // Notify the client on send (queued WhatsApp).
  if (action === "send" && lead.clientWhatsapp) {
    const linkLine = proposalLink ? `\n\nReview and accept your proposal here: ${proposalLink}` : "";
    await dispatchWhatsAppText({
      organizationId: auth.organizationId,
      to: lead.clientWhatsapp,
      messageType: "CUSTOM",
      relatedEntityType: "business_setup_proposal",
      relatedEntityId: lead.id,
      body: `Hi ${lead.clientName}, your business setup proposal is ready — total ${formatCurrency(Number(updated.totalFee), updated.currency)}, valid until ${new Date(updated.validUntil).toLocaleDateString("en-GB")}.${linkLine}`,
    });
  }

  return apiSuccess(serialize(updated));
}
