import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { createTapCharge } from "@/lib/tap";
import { decryptField } from "@/lib/encryption";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  // Throttle charge creation per user to prevent hammering the payment gateway.
  const limit = rateLimit(req, { key: "tap-checkout", limit: 15, windowMs: 60_000, identifier: user.id });
  if (!limit.ok) return rateLimitResponse(limit);

  const body = await req.json().catch(() => null);
  const invoiceId: string = body?.invoiceId;
  if (!invoiceId) return apiError("invoiceId is required", 400);

  // Member must own the invoice
  const member = await prisma.member.findFirst({
    where: { userId: user.id, deletedAt: null },
    include: {
      user: true,
      organization: { select: { tapSecretKey: true } },
    },
  });
  if (!member) return apiError("Member not found", 404);

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, memberId: member.id, deletedAt: null },
  });
  if (!invoice) return apiError("Invoice not found", 404);
  if (invoice.status === "PAID") return apiError("Invoice is already paid", 400);
  if (invoice.status === "CANCELLED") return apiError("Invoice is cancelled", 400);

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

  const tapKey = decryptField(member.organization?.tapSecretKey) ?? undefined;

  let charge: Awaited<ReturnType<typeof createTapCharge>>;
  try {
    charge = await createTapCharge({
      amount: Number(invoice.totalAmount),
      currency: invoice.currency,
      description: `Invoice ${invoice.invoiceNumber ?? invoice.id.slice(-8).toUpperCase()}`,
      metadata: {
        invoiceId: invoice.id,
        organizationId: invoice.organizationId,
        memberId: member.id,
      },
      customerEmail: member.user.email,
      customerName: member.user.name ?? member.user.email,
      redirectUrl: `${appUrl}/portal/invoices?tap_id={id}&tap_status={status}`,
      postUrl: `${appUrl}/api/webhooks/tap`,
      referenceTransaction: `inv_${invoice.id.slice(-8)}`,
    }, tapKey);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("not configured") || msg.includes("TAP_SECRET_KEY")) {
      return apiError("Payment gateway is not yet configured. Please contact the space team.", 503);
    }
    console.error("[tap/checkout]", err);
    return apiError("Failed to initiate payment. Please try again.", 502);
  }

  // Persist charge ID so the webhook can match by charge ID as a fallback
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { tapChargeId: charge.id },
  });

  return apiSuccess({ checkoutUrl: charge.transaction.url, chargeId: charge.id });
}
