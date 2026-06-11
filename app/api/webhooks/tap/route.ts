import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTapWebhook } from "@/lib/tap";

// Tap sends the full charge object as JSON. No auth header — identity is
// confirmed via the HMAC hashstring field inside the body.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const hashstring = typeof body.hashstring === "string" ? body.hashstring : "";
  const valid = await verifyTapWebhook(body, hashstring);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const status = body.status as string;
  const chargeId = body.id as string;

  // Only act on successful captures
  if (status !== "CAPTURED") {
    return NextResponse.json({ received: true });
  }

  const metadata = body.metadata as Record<string, string> | undefined;
  const invoiceId = metadata?.invoiceId;

  // Primary lookup: by invoiceId from metadata
  // Fallback: by tapChargeId (in case metadata was stripped)
  const invoice = invoiceId
    ? await prisma.invoice.findFirst({ where: { id: invoiceId, deletedAt: null } })
    : await prisma.invoice.findFirst({ where: { tapChargeId: chargeId, deletedAt: null } });

  if (!invoice) {
    console.warn("[tap webhook] Invoice not found — chargeId:", chargeId, "invoiceId:", invoiceId);
    return NextResponse.json({ received: true });
  }

  if (invoice.status !== "PAID") {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        tapChargeId: chargeId,
      },
    });
  }

  return NextResponse.json({ received: true });
}
