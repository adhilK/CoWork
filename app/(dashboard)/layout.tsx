import { redirect } from "next/navigation";
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
        stripeSubscriptionId: ctx.organization.stripeSubscriptionId,
      }}
      role={ctx.role}
    >
      {children}
    </DashboardShell>
  );
}
