import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, getBaseUrl } from "@/lib/utils";
import { computeInvoiceTotals } from "@/lib/jurisdiction";
import { createTapCharge } from "@/lib/tap";
import { decryptField } from "@/lib/encryption";

const schema = z.object({
  planId: z.string().min(1, "Plan ID is required"),
});

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const member = await prisma.member.findFirst({
    where: { userId: user.id, deletedAt: null },
    include: {
      user: { select: { email: true, name: true } },
      organization: {
        select: { currency: true, jurisdiction: true, paymentProvider: true, name: true, tapSecretKey: true },
      },
    },
  });
  if (!member) return apiError("Member not found", 404);

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");

  const plan = await prisma.membershipPlan.findFirst({
    where: { id: parsed.data.planId, organizationId: member.organizationId, isActive: true },
  });
  if (!plan) return apiError("Plan not found", 404);

  const subtotal = Number(plan.price);
  const totals = computeInvoiceTotals(subtotal, member.organization.jurisdiction);

  const count = await prisma.invoice.count({ where: { organizationId: member.organizationId } });
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invoice = await prisma.invoice.create({
    data: {
      organizationId: member.organizationId,
      memberId: member.id,
      invoiceNumber,
      amount: totals.totalAmount,
      subtotal: totals.subtotal,
      vatRate: totals.vatRate,
      vatAmount: totals.vatAmount,
      totalAmount: totals.totalAmount,
      currency: member.organization.currency ?? "AED",
      status: "PENDING",
      dueDate,
      notes: `PLAN_SUBSCRIPTION:${plan.id}`,
      lineItems: [
        {
          description: `${plan.name} — Monthly subscription`,
          quantity: 1,
          unitPrice: subtotal,
          total: subtotal,
        },
      ],
    },
  });

  const baseUrl = getBaseUrl();
  let checkoutUrl: string | null = null;

  try {
    if (member.organization.paymentProvider !== "MOYASAR") {
      const tapKey = decryptField(member.organization.tapSecretKey) ?? undefined;
      const charge = await createTapCharge({
        amount: totals.totalAmount,
        currency: member.organization.currency ?? "AED",
        description: `${plan.name} — ${member.organization.name}`,
        metadata: {
          invoiceId: invoice.id,
          organizationId: member.organizationId,
          memberId: member.id,
          planId: plan.id,
        },
        customerEmail: member.user.email,
        customerName: member.user.name ?? member.user.email,
        redirectUrl: `${baseUrl}/portal/invoices?tap_id={id}&tap_status={status}`,
        postUrl: `${baseUrl}/api/webhooks/tap`,
        referenceTransaction: `plan_${invoice.id.slice(-8)}`,
      }, tapKey);

      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { tapChargeId: charge.id },
      });

      checkoutUrl = charge.transaction.url;
    }
  } catch (err) {
    console.error("[portal/subscriptions] Payment charge failed:", err);
    // Return invoice without checkout URL — member can pay from invoices page
  }

  return apiSuccess({ invoiceId: invoice.id, checkoutUrl }, 201);
}
