import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can, isAdminRole, homePathForRole } from "@/lib/permissions";
import { LicenseCatalogView } from "@/components/business-setup/license-catalog-view";

export const metadata: Metadata = { title: "License Catalog — Maktaby" };
export const dynamic = "force-dynamic";

export default async function LicenseCatalogPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (!can(ctx.role, "businessSetup")) redirect(homePathForRole(ctx.role));

  const items = await prisma.licenseCatalog.findMany({
    where: { organizationId: ctx.organizationId, deletedAt: null },
    orderBy: [{ isPopular: "desc" }, { authority: "asc" }, { name: "asc" }],
  });

  const data = items.map((i) => ({
    ...i,
    baseCost: i.baseCost == null ? null : Number(i.baseCost),
    govFees: i.govFees == null ? null : Number(i.govFees),
    minShareCapital: i.minShareCapital == null ? null : Number(i.minShareCapital),
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  }));

  return (
    <LicenseCatalogView
      items={data as any}
      canManage={isAdminRole(ctx.role)}
      currency={ctx.organization.currency}
    />
  );
}
