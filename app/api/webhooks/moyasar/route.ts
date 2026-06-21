import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMoyasarWebhook } from "@/lib/moyasar";

// Moyasar POSTs the payment object as JSON.
// Identity is confirmed via HMAC-SHA256 of the raw body in the X-Signature header.
export async function POST(req: NextRequest) {
  // Read raw body before parsing — signature is computed over the raw bytes.
  const rawBody = await req.text();
  const signature = req.headers.get("X-Signature") ?? req.headers.get("x-signature") ?? "";

  const valid = await verifyMoyasarWebhook(rawBody, signature);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const status = body.status as string | undefined;
  const paymentId = body.id as string | undefined;

  // Only act on successful payments.
  if (status !== "paid") {
    return NextResponse.json({ received: true });
  }

  const metadata = body.metadata as Record<string, string> | undefined;
  const invoiceId = metadata?.invoiceId;
  const metaOrgId = metadata?.organizationId;

  // Always scope invoice lookup by organizationId from metadata when available.
  // This prevents a malformed webhook from marking a different org's invoice as paid.
  const invoice = invoiceId
    ? await prisma.invoice.findFirst({
        where: {
          id: invoiceId,
          ...(metaOrgId ? { organizationId: metaOrgId } : {}),
          deletedAt: null,
        },
      })
    : paymentId
    ? await prisma.invoice.findFirst({
        where: {
          moyasarPaymentId: paymentId,
          ...(metaOrgId ? { organizationId: metaOrgId } : {}),
          deletedAt: null,
        },
      })
    : null;

  if (!invoice) {
    console.warn("[moyasar webhook] Invoice not found — paymentId:", paymentId, "invoiceId:", invoiceId);
    return NextResponse.json({ received: true });
  }

  // Idempotent: only update if not already marked paid.
  if (invoice.status !== "PAID") {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        moyasarPaymentId: paymentId ?? invoice.moyasarPaymentId,
      },
    });
  }

  return NextResponse.json({ received: true });
}
