/**
 * POST /api/webhooks/dodo
 *
 * Receives Dodo Payments subscription lifecycle events and keeps
 * PlatformSubscription in sync. Public route — protected by signature
 * verification instead of session auth.
 *
 * Idempotency: every event is deduplicated via ProcessedWebhook using the
 * `webhook-id` header that Dodo sends (Standard Webhooks spec).
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhook, isDodoEnabled } from "@/lib/dodo";
import { sendPaymentFailed } from "@/lib/email";
import type { Plan } from "@prisma/client";
import type { Webhooks } from "dodopayments/resources/webhooks/webhooks";

const VALID_PLANS: Plan[] = ["STARTER", "GROWTH", "PRO", "ENTERPRISE"];

const PLAN_LABELS: Record<Plan, string> = {
  STARTER: "Starter",
  GROWTH: "Growth",
  PRO: "Business",
  ENTERPRISE: "Enterprise",
};

function parsePlan(s: string | undefined | null): Plan | null {
  if (!s) return null;
  const upper = s.toUpperCase() as Plan;
  return VALID_PLANS.includes(upper) ? upper : null;
}

export async function POST(request: Request) {
  if (!isDodoEnabled()) {
    return NextResponse.json({ error: "Dodo not configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  const headerMap: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headerMap[key] = value;
  });

  // ── Verify signature ──────────────────────────────────────────────────────
  let event: Webhooks.UnwrapWebhookEvent;
  try {
    event = verifyWebhook(rawBody, headerMap) as Webhooks.UnwrapWebhookEvent;
  } catch (err) {
    console.error("[dodo webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // ── Idempotency — skip if already processed ───────────────────────────────
  const webhookId = headerMap["webhook-id"] ?? "";
  if (webhookId) {
    const already = await prisma.processedWebhook.findUnique({
      where: { webhookId_source: { webhookId, source: "dodo" } },
      select: { webhookId: true },
    });
    if (already) {
      return NextResponse.json({ ok: true, skipped: true });
    }
    await prisma.processedWebhook.create({ data: { webhookId, source: "dodo" } });
  }

  // ── Route by event type ───────────────────────────────────────────────────
  try {
    await handleEvent(event);
  } catch (err) {
    console.error("[dodo webhook] handler error:", err);
    // Return 200 to prevent Dodo from retrying an event that errored on our side
    return NextResponse.json({ ok: false, error: String(err) });
  }

  return NextResponse.json({ ok: true });
}

async function handleEvent(event: Webhooks.UnwrapWebhookEvent) {
  switch (event.type) {
    case "subscription.active": {
      const sub = event.data;
      const orgId = sub.metadata?.organizationId;
      if (!orgId) return;

      // Plan is passed in metadata at checkout creation time
      const newPlan = parsePlan(sub.metadata?.plan as string | undefined);

      await prisma.platformSubscription.updateMany({
        where: { organizationId: orgId },
        data: {
          status: "ACTIVE",
          ...(newPlan ? { plan: newPlan } : {}),
          dodoCustomerId: sub.customer.customer_id,
          dodoSubscriptionId: sub.subscription_id,
          currentPeriodStart: sub.previous_billing_date
            ? new Date(sub.previous_billing_date)
            : null,
          currentPeriodEnd: sub.next_billing_date
            ? new Date(sub.next_billing_date)
            : null,
          cancelledAt: null,
        },
      });

      // Keep Organization.plan in sync
      if (newPlan) {
        await prisma.organization.update({
          where: { id: orgId },
          data: { plan: newPlan },
        });
      }

      await prisma.notification.create({
        data: {
          organizationId: orgId,
          type: "PLAN_ACTIVATED",
          title: "Subscription activated",
          body: `Your ${newPlan ? PLAN_LABELS[newPlan] : ""} plan is now active. All features are unlocked.`.trim(),
        },
      });
      break;
    }

    case "subscription.renewed": {
      const sub = event.data;
      const orgId = sub.metadata?.organizationId;
      if (!orgId) return;

      await prisma.platformSubscription.updateMany({
        where: { organizationId: orgId },
        data: {
          status: "ACTIVE",
          currentPeriodStart: sub.previous_billing_date
            ? new Date(sub.previous_billing_date)
            : undefined,
          currentPeriodEnd: sub.next_billing_date
            ? new Date(sub.next_billing_date)
            : undefined,
        },
      });
      break;
    }

    case "subscription.cancelled": {
      const sub = event.data;
      const orgId = sub.metadata?.organizationId;
      if (!orgId) return;

      await prisma.platformSubscription.updateMany({
        where: { organizationId: orgId },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });

      await prisma.notification.create({
        data: {
          organizationId: orgId,
          type: "SUBSCRIPTION_CANCELLED",
          title: "Subscription cancelled",
          body: "Your subscription has been cancelled. You can reactivate at any time from Billing.",
        },
      });
      break;
    }

    case "subscription.failed":
    case "subscription.on_hold": {
      const sub = event.data;
      const orgId = sub.metadata?.organizationId;
      if (!orgId) break;

      await prisma.platformSubscription.updateMany({
        where: { organizationId: orgId },
        data: { status: "PAST_DUE" },
      });

      await prisma.notification.create({
        data: {
          organizationId: orgId,
          type: "PAYMENT_FAILED",
          title: "Payment failed",
          body: "We couldn't process your subscription payment. Please update your payment method.",
        },
      });

      await notifyPaymentFailed(orgId);
      break;
    }

    case "payment.failed": {
      // payment.failed fires for subscription renewal failures
      const payment = event.data;
      const subId = payment.subscription_id;
      if (!subId) break;

      // Look up org by the stored Dodo subscription ID
      const platformSub = await prisma.platformSubscription.findFirst({
        where: { dodoSubscriptionId: subId },
        select: { organizationId: true },
      });
      if (!platformSub) break;

      await prisma.platformSubscription.updateMany({
        where: { organizationId: platformSub.organizationId },
        data: { status: "PAST_DUE" },
      });

      await prisma.notification.create({
        data: {
          organizationId: platformSub.organizationId,
          type: "PAYMENT_FAILED",
          title: "Payment failed",
          body: "We couldn't process your subscription renewal. Please update your payment method to stay active.",
        },
      });

      await notifyPaymentFailed(platformSub.organizationId);
      break;
    }

    default:
      // Unhandled event type — no-op
      break;
  }
}

async function notifyPaymentFailed(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      name: true,
      email: true,
      users: {
        where: { role: "OWNER" },
        select: { user: { select: { email: true, name: true } } },
        take: 1,
      },
    },
  });
  if (!org) return;

  const ownerEmail = org.users[0]?.user.email ?? org.email;
  const ownerName = org.users[0]?.user.name ?? null;
  if (!ownerEmail) return;

  void sendPaymentFailed({
    to: ownerEmail,
    orgName: org.name,
    ownerName,
    billingUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/dashboard/billing`,
  });
}
