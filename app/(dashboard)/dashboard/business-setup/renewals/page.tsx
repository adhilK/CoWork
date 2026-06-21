import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { can, homePathForRole } from "@/lib/permissions";
import { LicenseRenewalsView } from "@/components/business-setup/license-renewals-view";

export const metadata: Metadata = { title: "License Renewals — Maktaby" };
export const dynamic = "force-dynamic";

export default async function LicenseRenewalsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (!can(ctx.role, "businessSetup")) redirect(homePathForRole(ctx.role));

  // Data is fetched client-side from /api/business-setup/renewals to keep this page light.
  return <LicenseRenewalsView />;
}
