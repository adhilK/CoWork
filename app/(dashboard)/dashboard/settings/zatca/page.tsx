import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isWafeqConfigured } from "@/lib/zatca/wafeq";
import { ZatcaSettingsView } from "@/components/zatca/zatca-settings-view";

export const metadata: Metadata = { title: "ZATCA E-Invoicing — Maktaby" };
export const dynamic = "force-dynamic";

export default async function ZatcaSettingsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const orgId = ctx.organizationId;

  const [org, config, recent, statusCounts] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        jurisdiction: true,
        taxRegistrationNumber: true,
        name: true,
        wafeqAccountId: true,
        zatcaDeviceId: true,
        zatcaCrNumber: true,
        zatcaVatNumber: true,
        zatcaAddress: true,
      },
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

  type ZatcaAddress = {
    street?: string;
    buildingNumber?: string;
    district?: string;
    city?: string;
    postalCode?: string;
  };

  return (
    <ZatcaSettingsView
      isOwner={ctx.role === "OWNER"}
      jurisdiction={org?.jurisdiction ?? "UAE"}
      sellerName={org?.name ?? null}
      crNumber={org?.zatcaCrNumber ?? null}
      zatcaVatNumber={org?.zatcaVatNumber ?? null}
      zatcaAddress={(org?.zatcaAddress as ZatcaAddress | null) ?? null}
      wafeqConfigured={isWafeqConfigured()}
      wafeqAccountId={org?.wafeqAccountId ?? null}
      deviceRegistered={!!org?.zatcaDeviceId}
      zatcaEnabled={config?.zatcaEnabled ?? false}
      arabicInvoices={config?.arabicInvoices ?? false}
      zatcaEnv={process.env.ZATCA_ENV ?? "simulation"}
      counts={counts}
      recent={recent.map((r) => ({
        id: r.id,
        invoiceNumber: r.invoiceNumber,
        memberName: r.member.user.name ?? r.member.user.email,
        totalAmount: Number(r.totalAmount),
        currency: r.currency,
        zatcaStatus: r.zatcaStatus,
        createdAt: r.createdAt.toISOString(),
      }))}
    />
  );
}
