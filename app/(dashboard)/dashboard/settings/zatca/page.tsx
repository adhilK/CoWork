import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ZATCA_API_URL, ZATCA_SANDBOX_URL } from "@/lib/zatca";
import { ZatcaSettingsView } from "@/components/zatca/zatca-settings-view";

export const metadata: Metadata = { title: "ZATCA E-Invoicing — CoWork Pro" };
export const dynamic = "force-dynamic";

export default async function ZatcaSettingsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const orgId = ctx.organizationId;

  const [org, config, recent, statusCounts] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { jurisdiction: true, taxRegistrationNumber: true, name: true },
    }),
    prisma.jurisdictionConfig.findUnique({
      where: { organizationId: orgId },
      select: { zatcaEnabled: true, arabicInvoices: true },
    }),
    prisma.invoice.findMany({
      where: { organizationId: orgId, deletedAt: null, zatcaStatus: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { member: { include: { user: { select: { name: true, email: true } } } } },
    }),
    prisma.invoice.groupBy({
      by: ["zatcaStatus"],
      where: { organizationId: orgId, deletedAt: null, zatcaStatus: { not: null } },
      _count: true,
    }),
  ]);

  const counts: Record<string, number> = {};
  for (const c of statusCounts) if (c.zatcaStatus) counts[c.zatcaStatus] = c._count;

  return (
    <ZatcaSettingsView
      isOwner={ctx.role === "OWNER"}
      jurisdiction={org?.jurisdiction ?? "UAE"}
      vatNumber={org?.taxRegistrationNumber ?? null}
      sellerName={org?.name ?? null}
      zatcaEnabled={config?.zatcaEnabled ?? false}
      arabicInvoices={config?.arabicInvoices ?? false}
      providerConfigured={!!(ZATCA_API_URL || ZATCA_SANDBOX_URL)}
      counts={counts}
      recent={recent.map((r) => ({
        id: r.id,
        invoiceNumber: r.invoiceNumber,
        memberName: r.member.user.name ?? r.member.user.email,
        totalAmount: Number(r.totalAmount),
        currency: r.currency,
        zatcaStatus: r.zatcaStatus,
        createdAt: r.createdAt.toISOString(),
      })) as any}
    />
  );
}
