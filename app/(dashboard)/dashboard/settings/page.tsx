import type { Metadata } from "next";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { can, homePathForRole } from "@/lib/permissions";
import { SettingsView } from "@/components/settings/settings-view";

export const metadata: Metadata = { title: "Settings — Maktaby" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  // Org settings are OWNER/ADMIN only.
  if (!can(ctx.role, "settings")) redirect(homePathForRole(ctx.role));

  // Full organization record (settings needs all editable fields)
  const [organization, platformSub] = await Promise.all([
    prisma.organization.findUnique({ where: { id: ctx.organizationId } }),
    prisma.platformSubscription.findUnique({
      where: { organizationId: ctx.organizationId },
      select: { status: true },
    }),
  ]);
  if (!organization) redirect("/onboarding");

  return (
    <SettingsView
      organization={organization as any}
      role={ctx.role}
      subscriptionStatus={platformSub?.status ?? null}
    />
  );
}
