import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can, homePathForRole } from "@/lib/permissions";
import { PipelineBoard } from "@/components/business-setup/pipeline-board";

export const metadata: Metadata = { title: "Business Setup Pipeline — Maktaby" };
export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (!can(ctx.role, "businessSetup")) redirect(homePathForRole(ctx.role));
  const orgId = ctx.organizationId;

  const [leads, staff, catalog] = await Promise.all([
    prisma.businessSetupLead.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
      include: { _count: { select: { activities: true } }, proposal: { select: { status: true } } },
    }),
    prisma.userOrganization.findMany({
      where: { organizationId: orgId, role: { not: "MEMBER" } },
      select: { userId: true, user: { select: { name: true, email: true } } },
    }),
    prisma.licenseCatalog.findMany({
      where: { organizationId: orgId, deletedAt: null, isActive: true },
      orderBy: [{ authority: "asc" }, { name: "asc" }],
      select: { id: true, authority: true, name: true, licenseType: true, emirate: true, baseCost: true, jurisdiction: true },
    }),
  ]);

  return (
    <PipelineBoard
      currentUserId={ctx.user.id}
      currency={ctx.organization.currency}
      staff={staff.map((s) => ({ userId: s.userId, name: s.user.name ?? s.user.email })) as any}
      catalog={catalog.map((c) => ({ ...c, baseCost: c.baseCost == null ? null : Number(c.baseCost) })) as any}
      leads={leads.map((l) => ({
        id: l.id,
        clientName: l.clientName,
        companyName: l.companyName,
        stage: l.stage,
        priority: l.priority,
        assignedTo: l.assignedTo,
        licenseType: l.licenseType,
        source: l.source,
        quotedFee: l.quotedFee == null ? null : Number(l.quotedFee),
        estimatedFee: l.estimatedFee == null ? null : Number(l.estimatedFee),
        currency: l.currency,
        activityCount: l._count.activities,
        proposalStatus: l.proposal?.status ?? null,
        updatedAt: l.updatedAt.toISOString(),
      })) as any}
    />
  );
}
