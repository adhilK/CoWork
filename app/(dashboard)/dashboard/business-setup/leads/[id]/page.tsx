import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can, homePathForRole } from "@/lib/permissions";
import { LeadDetailView } from "@/components/business-setup/lead-detail-view";

export const metadata: Metadata = { title: "Lead â€” Maktaby" };
export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (!can(ctx.role, "businessSetup")) redirect(homePathForRole(ctx.role));
  const orgId = ctx.organizationId;

  const [lead, staffRows] = await Promise.all([
    prisma.businessSetupLead.findFirst({
      where: { id: params.id, organizationId: orgId, deletedAt: null },
      include: {
        activities: { orderBy: { createdAt: "desc" } },
        proposal: true,
        application: true,
        member: { include: { user: { select: { name: true, email: true } } } },
      },
    }),
    prisma.userOrganization.findMany({
      where: { organizationId: orgId },
      select: { userId: true, role: true, user: { select: { name: true, email: true } } },
    }),
  ]);

  if (!lead) notFound();

  const staffMap: Record<string, string> = {};
  for (const s of staffRows) staffMap[s.userId] = s.user.name ?? s.user.email;
  const staff = staffRows
    .filter((s) => s.role !== "MEMBER")
    .map((s) => ({ userId: s.userId, name: s.user.name ?? s.user.email }));

  const lc = lead.licenseCatalogId
    ? await prisma.licenseCatalog.findFirst({
        where: { id: lead.licenseCatalogId, organizationId: orgId },
        select: { authority: true, name: true, baseCost: true, govFees: true, visaQuota: true, officeType: true },
      })
    : null;

  const serialized = {
    ...lead,
    estimatedFee: lead.estimatedFee == null ? null : Number(lead.estimatedFee),
    quotedFee: lead.quotedFee == null ? null : Number(lead.quotedFee),
    expectedCloseDate: lead.expectedCloseDate?.toISOString() ?? null,
    closedAt: lead.closedAt?.toISOString() ?? null,
    createdAt: lead.createdAt.toISOString(),
    activities: lead.activities.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })),
    proposal: lead.proposal
      ? {
          ...lead.proposal,
          subtotal: Number(lead.proposal.subtotal),
          totalFee: Number(lead.proposal.totalFee),
          validUntil: lead.proposal.validUntil.toISOString(),
          sentAt: lead.proposal.sentAt?.toISOString() ?? null,
          acceptedAt: lead.proposal.acceptedAt?.toISOString() ?? null,
          createdAt: lead.proposal.createdAt.toISOString(),
        }
      : null,
    application: lead.application
      ? {
          ...lead.application,
          submittedAt: lead.application.submittedAt?.toISOString() ?? null,
          approvedAt: lead.application.approvedAt?.toISOString() ?? null,
          licenseExpiry: lead.application.licenseExpiry?.toISOString() ?? null,
          createdAt: lead.application.createdAt.toISOString(),
        }
      : null,
    member: lead.member ? { id: lead.member.id, name: lead.member.user.name, email: lead.member.user.email } : null,
    catalogProduct: lc ? { ...lc, baseCost: lc.baseCost == null ? null : Number(lc.baseCost), govFees: lc.govFees == null ? null : Number(lc.govFees) } : null,
  };

  return <LeadDetailView lead={serialized as any} staff={staff as any} staffMap={staffMap} />;
}