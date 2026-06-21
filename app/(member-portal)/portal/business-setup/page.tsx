import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { BusinessSetupPortalView } from "@/components/portal/business-setup-portal-view";

export const metadata: Metadata = { title: "Business Setup — Maktaby" };
export const dynamic = "force-dynamic";

export default async function PortalBusinessSetupPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const member = await prisma.member.findFirst({
    where: { userId: user.id, deletedAt: null },
    select: { id: true, organizationId: true },
  });
  if (!member) redirect("/login");

  const leads = await prisma.businessSetupLead.findMany({
    where: { memberId: member.id, organizationId: member.organizationId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      proposal: {
        select: { status: true, totalFee: true, currency: true, validUntil: true, publicToken: true, acceptedAt: true },
      },
      application: {
        select: { steps: true, licenseNumber: true, licenseExpiry: true, referenceNumber: true, approvedAt: true },
      },
    },
  });

  return (
    <BusinessSetupPortalView
      leads={leads.map((l) => ({
        id: l.id,
        companyName: l.companyName,
        licenseType: l.licenseType,
        jurisdiction: l.jurisdiction,
        stage: l.stage,
        estimatedFee: l.estimatedFee == null ? null : Number(l.estimatedFee),
        quotedFee: l.quotedFee == null ? null : Number(l.quotedFee),
        currency: l.currency,
        createdAt: l.createdAt.toISOString(),
        proposal: l.proposal
          ? {
              status: l.proposal.status,
              totalFee: Number(l.proposal.totalFee),
              currency: l.proposal.currency,
              validUntil: l.proposal.validUntil.toISOString(),
              publicToken: l.proposal.publicToken,
              acceptedAt: l.proposal.acceptedAt?.toISOString() ?? null,
            }
          : null,
        application: l.application
          ? {
              steps: l.application.steps as { step: string; status: string }[],
              licenseNumber: l.application.licenseNumber,
              licenseExpiry: l.application.licenseExpiry?.toISOString() ?? null,
              referenceNumber: l.application.referenceNumber,
              approvedAt: l.application.approvedAt?.toISOString() ?? null,
            }
          : null,
      }))}
    />
  );
}
