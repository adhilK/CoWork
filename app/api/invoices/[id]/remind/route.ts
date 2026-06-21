import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";
import { createPaymentLink } from "@/lib/payments";
import { dispatchWhatsAppText } from "@/lib/jobs";

function fmtCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-AE", { style: "currency", currency }).format(amount);
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);

  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, organizationId: auth.organizationId, deletedAt: null },
    include: {
      member: {
        include: {
          user: { select: { email: true, name: true } },
          organization: { select: { name: true, paymentProvider: true } },
        },
      },
    },
  });

  if (!invoice) return apiError("Invoice not found", 404);
  if (invoice.status !== "OVERDUE") return apiError("Invoice is not overdue", 400);
  if (invoice.remindersSent >= 3) return apiError("Maximum reminders (3) already sent", 400);

  const m = invoice.member;
  if (!m.whatsAppNumber) return apiError("Member has no WhatsApp number", 400);

  // Generate a fresh payment link for the reminder.
  let paymentUrl: string | null = null;
  try {
    const link = await createPaymentLink({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: Number(invoice.totalAmount),
      currency: invoice.currency,
      organizationId: invoice.organizationId,
      memberId: m.id,
      customerEmail: m.user.email ?? "",
      customerName: m.user.name,
      paymentProvider: m.organization.paymentProvider,
    });
    paymentUrl = link.checkoutUrl;
  } catch (err) {
    console.error("[remind] createPaymentLink failed for invoice", invoice.id, err);
  }

  const ref = invoice.invoiceNumber ?? `INV-${invoice.id.slice(-8).toUpperCase()}`;
  const amount = fmtCurrency(Number(invoice.totalAmount), invoice.currency);
  const due = invoice.dueDate.toLocaleDateString("en-GB");
  const payLine = paymentUrl ? `\n\nPay now: ${paymentUrl}` : "";
  const attempt = invoice.remindersSent + 1;

  await dispatchWhatsAppText({
    organizationId: invoice.organizationId,
    to: m.whatsAppNumber,
    memberId: m.id,
    messageType: "PAYMENT_REMINDER",
    relatedEntityType: "invoice",
    relatedEntityId: invoice.id,
    body: `Reminder ${attempt}/3: invoice ${ref} for ${amount} was due ${due} and remains unpaid. Please settle at your earliest convenience.${payLine}`,
  });

  const updated = await prisma.invoice.update({
    where: { id: invoice.id },
    data: { remindersSent: { increment: 1 }, lastReminderAt: new Date() },
  });

  return apiSuccess({ remindersSent: updated.remindersSent, lastReminderAt: updated.lastReminderAt });
}
