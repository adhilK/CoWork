import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { createMoyasarPayment } from "@/lib/moyasar";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  // Throttle charge creation per user to prevent hammering the payment gateway.
  const limit = rateLimit(req, { key: "moyasar-checkout", limit: 15, windowMs: 60_000, identifier: user.id });
  if (!limit.ok) return rateLimitResponse(limit);

  const body = await req.json().catch(() => null);
  const invoiceId: string = body?.invoiceId;
  if (!invoiceId) return apiError("invoiceId is required", 400);

  // Member must own the invoice.
  const member = await prisma.member.findFirst({
    where: { userId: user.id, deletedAt: null },
    include: { user: true },
  });
  if (!member) return apiError("Member not found", 404);

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, memberId: member.id, deletedAt: null },
  });
  if (!invoice) return apiError("Invoice not found", 404);
  if (invoice.status === "PAID") return apiError("Invoice is already paid", 400);
  if (invoice.status === "CANCELLED") return apiError("Invoice is cancelled", 400);

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const ref = invoice.invoiceNumber ?? `INV-${invoice.id.slice(-8).toUpperCase()}`;

  const payment = await createMoyasarPayment({
    amount: Number(invoice.totalAmount),
    currency: invoice.currency,
    description: `Invoice ${ref}`,
    metadata: {
      invoiceId: invoice.id,
      organizationId: invoice.organizationId,
      memberId: member.id,
    },
    // Moyasar appends ?id=<id>&status=<status> to this URL after payment.
    callbackUrl: `${appUrl}/portal/invoices?gateway=moyasar`,
  });

  // Persist payment ID so the webhook can match by ID as a fallback.
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      moyasarPaymentId: payment.id,
      moyasarCheckoutUrl: payment.checkoutUrl,
    },
  });

  return apiSuccess({ checkoutUrl: payment.checkoutUrl, paymentId: payment.id });
}
