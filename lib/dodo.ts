import DodoPayments from "dodopayments";
import type { Plan } from "@prisma/client";

// Plan → product env-var name (PRO is marketed as "Business").
// Products are priced in USD; Dodo Adaptive Currency converts to AED/SAR at checkout.
const PLAN_ENV: Partial<Record<Plan, string>> = {
  STARTER: "STARTER",
  GROWTH: "GROWTH",
  PRO: "BUSINESS",
};

function productId(plan: Plan): string | null {
  const key = PLAN_ENV[plan];
  if (!key) return null;
  return process.env[`DODO_PRODUCT_${key}`] ?? null;
}

function client(): DodoPayments | null {
  const apiKey = process.env.DODO_API_KEY;
  if (!apiKey) return null;
  const env =
    (process.env.DODO_MODE ?? "test") === "live" ? "live_mode" : "test_mode";
  return new DodoPayments({
    bearerToken: apiKey,
    webhookKey: process.env.DODO_WEBHOOK_SECRET ?? null,
    environment: env,
  });
}

export function isDodoEnabled(): boolean {
  return !!process.env.DODO_API_KEY;
}

export async function createCheckoutSession(
  plan: Plan,
  organizationId: string,
  customerEmail: string,
  customerName?: string | null
): Promise<{ checkoutUrl: string }> {
  const c = client();
  if (!c) throw new Error("Dodo Payments not configured (DODO_API_KEY missing)");

  const pid = productId(plan);
  if (!pid) {
    throw new Error(
      `No Dodo product configured for plan ${plan}. ` +
        `Set DODO_PRODUCT_${PLAN_ENV[plan]} in env.`
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await c.checkoutSessions.create({
    product_cart: [{ product_id: pid, quantity: 1 }],
    customer: { email: customerEmail, name: customerName ?? undefined },
    return_url: `${appUrl}/dashboard/billing?checkout=success`,
    metadata: { organizationId, plan: plan as string },
  });

  if (!session.checkout_url) {
    throw new Error("Dodo did not return a checkout URL");
  }
  return { checkoutUrl: session.checkout_url };
}

export async function createCustomerPortalSession(
  dodoCustomerId: string
): Promise<{ portalUrl: string }> {
  const c = client();
  if (!c) throw new Error("Dodo Payments not configured (DODO_API_KEY missing)");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const result = await c.customers.customerPortal.create(dodoCustomerId, {
    return_url: `${appUrl}/dashboard/billing`,
  });
  return { portalUrl: result.link };
}

export function verifyWebhook(
  rawBody: string,
  headers: Record<string, string>
) {
  const c = client();
  if (!c) throw new Error("Dodo Payments not configured (DODO_API_KEY missing)");
  return c.webhooks.unwrap(rawBody, { headers });
}

export async function getSubscription(subscriptionId: string) {
  const c = client();
  if (!c) throw new Error("Dodo Payments not configured (DODO_API_KEY missing)");
  return c.subscriptions.retrieve(subscriptionId);
}
