import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getAuthContext, getCurrentUser } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAuthContext();
  if (!ctx) {
    // Distinguish "not logged in" from "logged in but no org"
    const user = await getCurrentUser();
    redirect(user ? "/onboarding" : "/login");
  }

  // ── ROLE GUARD ───────────────────────────────────────────────────────────
  // The admin dashboard is for OWNER/ADMIN only. A MEMBER must never see org
  // data, billing, other members, etc. Send them to their member portal.
  if (ctx.role === "MEMBER") {
    redirect("/portal");
  }

  // ── TRIAL EXPIRY GATE ────────────────────────────────────────────────────
  // Block access to all dashboard routes when the trial has expired and the
  // org has no active subscription. Billing page is always allowed through so
  // the operator can upgrade.
  const { trialEndsAt, platformSubscriptionStatus } = ctx.organization;
  const trialExpired =
    trialEndsAt !== null &&
    new Date(trialEndsAt) < new Date() &&
    platformSubscriptionStatus !== "ACTIVE";

  if (trialExpired) {
    const headersList = await headers();
    const currentPath = headersList.get("x-pathname") ?? "/dashboard";
    if (!currentPath.startsWith("/dashboard/billing")) {
      redirect("/dashboard/billing?paywall=1");
    }
  }

  return (
    <DashboardShell
      user={{
        id: ctx.user.id,
        email: ctx.user.email,
        name: ctx.user.name,
        avatar: ctx.user.avatar,
      }}
      organization={{
        id: ctx.organization.id,
        name: ctx.organization.name,
        slug: ctx.organization.slug,
        plan: ctx.organization.plan,
        currency: ctx.organization.currency,
        timezone: ctx.organization.timezone,
        trialEndsAt: ctx.organization.trialEndsAt,
        platformSubscriptionStatus: ctx.organization.platformSubscriptionStatus,
      }}
      role={ctx.role}
    >
      {children}
    </DashboardShell>
  );
}
