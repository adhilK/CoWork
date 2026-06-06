import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { sendInvoiceEmail } from "@/lib/email";
import { startOfMonth, endOfMonth, addDays } from "date-fns";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Automated monthly billing.
 *
 * Run on the 1st of each month (Vercel Cron or any scheduler). For every
 * active member on a membership plan it:
 *   1. creates a PENDING invoice for the plan price for this period
 *      (idempotent — skips if one already exists for the period),
 *   2. resets the member's booking credits to the plan's included amount,
 *   3. emails the member the invoice.
 *
 * Protected by CRON_SECRET. Vercel Cron sends `Authorization: Bearer <secret>`;
 * a manual trigger can use the `x-cron-secret` header.
 */
function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const bearer = req.headers.get("authorization");
  const custom = req.headers.get("x-cron-secret");
  return bearer === `Bearer ${secret}` || custom === secret;
}

async function runBilling() {
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
      organization: { select: { name: true, currency: true } },
    },
  });

  let created = 0, skipped = 0;

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
    const amount = Number(m.membershipPlan.price);
    const lineItems = [{
      description: `${m.membershipPlan.name} membership — ${periodStart.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`,
      quantity: 1, unitPrice: amount, total: amount,
    }];

    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          organizationId: m.organizationId, memberId: m.id, invoiceNumber,
          amount, currency: m.organization.currency ?? "GBP", status: "PENDING",
          dueDate, periodStart, periodEnd, lineItems,
        },
      });
      // Reset booking credits to the plan's monthly allowance
      await tx.member.update({
        where: { id: m.id },
        data: { credits: m.membershipPlan!.includedCredits },
      });
      return inv;
    });

    created++;
    if (m.user.email) {
      void sendInvoiceEmail({
        to: m.user.email, memberName: m.user.name, orgName: m.organization.name,
        invoiceNumber, amount, currency: m.organization.currency ?? "GBP",
        dueDate, lineItems: lineItems.map((li) => ({ description: li.description, total: li.total })),
      });
    }
  }

  return { created, skipped, total: members.length };
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return apiError("Unauthorized", 401);
  const result = await runBilling();
  return apiSuccess({ ok: true, ...result });
}

// Vercel Cron issues GET requests
export async function GET(req: NextRequest) {
  if (!authorized(req)) return apiError("Unauthorized", 401);
  const result = await runBilling();
  return apiSuccess({ ok: true, ...result });
}
