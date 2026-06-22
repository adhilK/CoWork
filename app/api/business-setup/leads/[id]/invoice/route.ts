/**
 * POST /api/business-setup/leads/[id]/invoice
 * Generate an invoice from an accepted Business Setup proposal and link it back.
 * The lead must have been converted to a member (memberId set) before invoicing.
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";
import { computeInvoiceTotals } from "@/lib/jurisdiction";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);

  const lead = await prisma.businessSetupLead.findFirst({
    where: { id: params.id, organizationId: auth.organizationId, deletedAt: null },
    include: {
      proposal: true,
      member: { include: { organization: { select: { jurisdiction: true } } } },
    },
  });
  if (!lead) return apiError("Lead not found", 404);

  if (!lead.proposal) return apiError("No proposal exists on this lead", 400);
  if (lead.proposal.status !== "ACCEPTED") {
    return apiError("Invoice can only be generated for an accepted proposal", 400);
  }
  if (lead.proposal.invoiceId) {
    return apiError("An invoice has already been generated for this proposal", 409);
  }
  if (!lead.memberId) {
    return apiError("Convert this lead to a member first before generating an invoice", 400);
  }

  const subtotal = Number(lead.proposal.totalFee);
  const jurisdiction = lead.member!.organization.jurisdiction;
  const totals = computeInvoiceTotals(subtotal, jurisdiction);

  const year = new Date().getFullYear();
  const count = await prisma.invoice.count({ where: { organizationId: auth.organizationId } });
  const invoiceNumber = `INV-${year}-${String(count + 1).padStart(4, "0")}`;

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const companyLabel = lead.companyName ? ` — ${lead.companyName}` : "";
  const lineItems = (lead.proposal.lineItems as { service: string; description?: string | null; fee: number }[]).map(
    (li) => ({ description: li.service + (li.description ? `: ${li.description}` : ""), quantity: 1, unitPrice: li.fee, total: li.fee }),
  );

  const { invoice } = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.create({
      data: {
        organizationId: auth.organizationId,
        memberId: lead.memberId!,
        invoiceNumber,
        amount: totals.totalAmount,
        subtotal: totals.subtotal,
        vatRate: totals.vatRate,
        vatAmount: totals.vatAmount,
        totalAmount: totals.totalAmount,
        currency: lead.currency,
        status: "PENDING",
        dueDate,
        notes: `Business Setup — ${lead.clientName}${companyLabel}`,
        lineItems,
      },
    });
    await tx.businessSetupProposal.update({
      where: { id: lead.proposal!.id },
      data: { invoiceId: inv.id },
    });
    return { invoice: inv };
  });

  return apiSuccess({ invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber }, 201);
}
