import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { canBilling, homePathForRole } from "@/lib/permissions";
import { BillingView } from "@/components/billing/billing-view";

export const metadata: Metadata = { title: "Billing & Plan — CoWork Pro" };
export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  // Billing is owner-only.
  if (!canBilling(ctx.role)) redirect(homePathForRole(ctx.role));

  const trialEndsAt = ctx.organization.trialEndsAt;
  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <BillingView
      currentPlan={ctx.organization.plan}
      trialDaysLeft={trialDaysLeft}
      hasSubscription={
        ctx.organization.platformSubscriptionStatus === "ACTIVE" ||
        ctx.organization.platformSubscriptionStatus === "PAST_DUE"
      }
      jurisdiction={ctx.organization.jurisdiction}
    />
  );
}
