import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { BillingView } from "@/components/billing/billing-view";

export const metadata: Metadata = { title: "Billing & Plan — CoWork Pro" };
export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const trialEndsAt = ctx.organization.trialEndsAt;
  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <BillingView
      currentPlan={ctx.organization.plan}
      trialDaysLeft={trialDaysLeft}
      hasSubscription={!!ctx.organization.stripeSubscriptionId}
    />
  );
}
