/**
 * Payment gateway router.
 *
 * Abstracts Tap (UAE/GCC-primary) vs Moyasar (KSA-secondary, Mada/STC Pay)
 * so billing jobs and other callers don't hardcode a gateway.
 *
 * The org's `paymentProvider` field (TAP | MOYASAR) drives the branch.
 * Default is TAP so existing UAE orgs are unaffected by the schema addition.
 */

import { prisma } from "@/lib/prisma";
import { createTapCharge } from "@/lib/tap";
import { createMoyasarPayment } from "@/lib/moyasar";

const appUrl = () =>
  (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export interface PaymentLinkResult {
  checkoutUrl: string;
  chargeId: string;
  provider: "TAP" | "MOYASAR";
}

/**
 * Create a hosted payment link for an invoice using the org's configured
 * payment gateway. Saves the gateway's charge/payment ID back to the invoice
 * row so the webhook can look up the invoice on callback.
 *
 * @param totalAmount - Major currency units (AED / SAR, NOT halalas/fils).
 * @param paymentProvider - "TAP" | "MOYASAR" from org.paymentProvider.
 */
export async function createPaymentLink(opts: {
  invoiceId: string;
  invoiceNumber: string | null;
  totalAmount: number;
  currency: string;
  organizationId: string;
  memberId: string;
  customerEmail: string;
  customerName: string | null;
  paymentProvider: string;
  tapSecretKey?: string;
  moyasarApiKey?: string;
}): Promise<PaymentLinkResult> {
  const base = appUrl();
  const ref = opts.invoiceNumber ?? `INV-${opts.invoiceId.slice(-8).toUpperCase()}`;
  const meta = {
    invoiceId: opts.invoiceId,
    organizationId: opts.organizationId,
    memberId: opts.memberId,
  };

  if (opts.paymentProvider === "MOYASAR") {
    // Moyasar appends ?id=<payment_id>&status=<status> to the callback URL.
    // We prefix with ?gateway=moyasar so the portal can identify the provider.
    const payment = await createMoyasarPayment({
      amount: opts.totalAmount,
      currency: opts.currency,
      description: `Invoice ${ref}`,
      metadata: meta,
      callbackUrl: `${base}/portal/invoices?gateway=moyasar`,
    });

    await prisma.invoice.update({
      where: { id: opts.invoiceId },
      data: {
        moyasarPaymentId: payment.id,
        moyasarCheckoutUrl: payment.checkoutUrl,
      },
    });

    return { checkoutUrl: payment.checkoutUrl, chargeId: payment.id, provider: "MOYASAR" };
  }

  // Default: TAP (UAE primary; also KSA when operator hasn't switched to Moyasar)
  const charge = await createTapCharge({
    amount: opts.totalAmount,
    currency: opts.currency,
    description: `Invoice ${ref}`,
    metadata: meta,
    customerEmail: opts.customerEmail,
    customerName: opts.customerName ?? opts.customerEmail,
    // Tap replaces {id} and {status} literals before redirecting.
    redirectUrl: `${base}/portal/invoices?tap_id={id}&tap_status={status}`,
    postUrl: `${base}/api/webhooks/tap`,
    referenceTransaction: `inv_${opts.invoiceId.slice(-8)}`,
  }, opts.tapSecretKey);

  await prisma.invoice.update({
    where: { id: opts.invoiceId },
    data: { tapChargeId: charge.id },
  });

  return { checkoutUrl: charge.transaction.url, chargeId: charge.id, provider: "TAP" };
}
