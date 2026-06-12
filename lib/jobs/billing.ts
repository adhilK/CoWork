/**
 * Monthly billing — shared logic used by both the Inngest scheduled function
 * and the /api/cron/monthly-billing fallback route.
 *
 * For every active member on a membership plan it:
 *   1. creates a PENDING invoice for the plan price for this period
 *      (idempotent — skips if one already exists for the period),
 *   2. resets the member's booking credits to the plan's included amount,
 *   3. emails the invoice and queues a WhatsApp "invoice issued" message.
 */

import { prisma } from "@/lib/prisma";
import { computeInvoiceTotals } from "@/lib/jurisdiction";
import { sendInvoiceEmail } from "@/lib/email";
import { dispatchWhatsAppText } from "@/lib/jobs";
import { formatCurrency } from "@/lib/utils";
import { startOfMonth, endOfMonth, addDays } from "date-fns";

export type BillingResult = { created: number; skipped: number; total: number };

export async function runMonthlyBilling(): Promise<BillingResult> {
  const now = new Date();
  const periodStart = startOfMonth(now);
  const periodEnd = endOfMonth(now);
  const dueDate = addDays(now, 14);
  const year = now.getFullYear();

  const members = await prisma.member.findMany({
    where: { status: "ACTIVE", deletedAt: null, membershipPlanId: { not: null } },
    include: {
      user: { select: { email: true, name: true } },
      membershipPlan: true,
      organization: { select: { name: true, currency: true, jurisdiction: true } },
    },
  });

  let created = 0;
  let skipped = 0;

  for (const m of members) {
    if (!m.membershipPlan) { skipped++; continue; }

    // Idempotency: already invoiced for this period?
    const existing = await prisma.invoice.findFirst({
      where: { memberId: m.id, periodStart: { gte: periodStart, lte: periodEnd }, deletedAt: null },
      select: { id: true },
    });
    if (existing) { skipped++; continue; }

    const count = await prisma.invoice.count({ where: { organizationId: m.organizationId } });
    const invoiceNumber = `INV-${year}-${String(count + 1).padStart(4, "0")}`;
    const planPrice = Number(m.membershipPlan.price);
    const totals = computeInvoiceTotals(planPrice, m.organization.jurisdiction);
    const currency = m.organization.currency ?? "AED";
    const lineItems = [{
      description: `${m.membershipPlan.name} membership — ${periodStart.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`,
      quantity: 1, unitPrice: planPrice, total: planPrice,
    }];

    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          organizationId: m.organizationId, memberId: m.id, invoiceNumber,
          amount: totals.totalAmount,
          subtotal: totals.subtotal, vatRate: totals.vatRate,
          vatAmount: totals.vatAmount, totalAmount: totals.totalAmount,
          currency, status: "PENDING",
          dueDate, periodStart, periodEnd, lineItems,
        },
      });
      await tx.member.update({
        where: { id: m.id },
        data: { credits: m.membershipPlan!.includedCredits },
      });
      return inv;
    });

    created++;

    // Email (fire-and-forget)
    if (m.user.email) {
      void sendInvoiceEmail({
        to: m.user.email, memberName: m.user.name, orgName: m.organization.name,
        invoiceNumber, amount: totals.totalAmount, currency,
        subtotal: totals.subtotal, vatAmount: totals.vatAmount, vatRate: totals.vatRate,
        dueDate, lineItems: lineItems.map((li) => ({ description: li.description, total: li.total })),
      });
    }

    // WhatsApp "invoice issued" — queued via Inngest when available.
    if (m.whatsAppNumber) {
      await dispatchWhatsAppText({
        organizationId: m.organizationId,
        to: m.whatsAppNumber,
        memberId: m.id,
        messageType: "INVOICE_ISSUED",
        relatedEntityType: "invoice",
        relatedEntityId: invoice.id,
        body: `Hi ${m.user.name ?? "there"}, your invoice ${invoiceNumber} for ${formatCurrency(totals.totalAmount, currency)} is ready. Due ${dueDate.toLocaleDateString("en-GB")}.`,
      });
    }
  }

  return { created, skipped, total: members.length };
}
