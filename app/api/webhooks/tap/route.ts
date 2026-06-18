import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTapWebhook } from "@/lib/tap";

// Tap sends the full charge object as JSON. Identity confirmed via HMAC hashstring.
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

  if (status !== "CAPTURED") {
    return NextResponse.json({ received: true });
  }

  const metadata = body.metadata as Record<string, string> | undefined;
  const invoiceId = metadata?.invoiceId;

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
      data: { status: "PAID", paidAt: new Date(), tapChargeId: chargeId },
    });

    // If this invoice is for a plan subscription, assign the plan to the member
    const planId = metadata?.planId ?? extractPlanFromNotes(invoice.notes);
    if (planId && invoice.memberId) {
      await prisma.member.update({
        where: { id: invoice.memberId },
        data: { membershipPlanId: planId },
      }).catch((err) => {
        console.error("[tap webhook] Failed to assign plan:", err);
      });
    }
  }

  return NextResponse.json({ received: true });
}

function extractPlanFromNotes(notes: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/^PLAN_SUBSCRIPTION:(.+)$/);
  return match?.[1] ?? null;
}
