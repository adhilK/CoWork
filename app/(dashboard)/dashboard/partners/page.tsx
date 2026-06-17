import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can, homePathForRole } from "@/lib/permissions";
import { PartnersView } from "@/components/partners/partners-view";

export const metadata: Metadata = { title: "Partners — Maktaby" };
export const dynamic = "force-dynamic";

export default async function PartnersPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (!can(ctx.role, "partners")) redirect(homePathForRole(ctx.role));
  const orgId = ctx.organizationId;

  const [partners, referrals] = await Promise.all([
    prisma.partner.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { referrals: { where: { deletedAt: null }, select: { status: true, commissionAmount: true } } },
    }),
    prisma.referral.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { partner: { select: { name: true } } },
    }),
  ]);

  const partnerData = partners.map((p) => {
    const earned = p.referrals.filter((r) => r.status === "CONVERTED" || r.status === "PAID").reduce((s, r) => s + Number(r.commissionAmount ?? 0), 0);
    const paid = p.referrals.filter((r) => r.status === "PAID").reduce((s, r) => s + Number(r.commissionAmount ?? 0), 0);
    return {
      id: p.id, name: p.name, companyName: p.companyName, type: p.type, email: p.email, phone: p.phone, whatsapp: p.whatsapp,
      commissionType: p.commissionType, commissionRate: Number(p.commissionRate), currency: p.currency,
      notes: p.notes, isActive: p.isActive, hasPayoutDetails: !!p.payoutDetails,
      referralCount: p.referrals.length, commissionEarned: earned, commissionPaid: paid, commissionOutstanding: earned - paid,
    };
  });

  const referralData = referrals.map((r) => ({
    id: r.id, partnerId: r.partnerId, partnerName: r.partner.name,
    clientName: r.clientName, clientPhone: r.clientPhone, clientEmail: r.clientEmail,
    serviceDescription: r.serviceDescription, leadId: r.leadId, status: r.status,
    dealValue: r.dealValue == null ? null : Number(r.dealValue),
    commissionAmount: r.commissionAmount == null ? null : Number(r.commissionAmount),
    currency: r.currency, payoutReference: r.payoutReference,
    convertedAt: r.convertedAt?.toISOString() ?? null, paidAt: r.paidAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <PartnersView
      currency={ctx.organization.currency}
      partners={partnerData as any}
      referrals={referralData as any}
    />
  );
}
