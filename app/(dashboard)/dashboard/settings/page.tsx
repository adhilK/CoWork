import type { Metadata } from "next";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SettingsView } from "@/components/settings/settings-view";

export const metadata: Metadata = { title: "Settings — CoWork Pro" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  // Full organization record (settings needs all editable fields)
  const organization = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
  });
  if (!organization) redirect("/onboarding");

  return <SettingsView organization={organization as any} />;
}
