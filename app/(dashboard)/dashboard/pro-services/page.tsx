import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can, homePathForRole } from "@/lib/permissions";
import { ProServicesView } from "@/components/pro-services/pro-services-view";

export const metadata: Metadata = { title: "PRO Services — Maktaby" };
export const dynamic = "force-dynamic";

export default async function ProServicesPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (!can(ctx.role, "proServices")) redirect(homePathForRole(ctx.role));
  const orgId = ctx.organizationId;

  const [requests, members, staffRows] = await Promise.all([
    prisma.proServiceRequest.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      include: { member: { include: { user: { select: { name: true, email: true } } } } },
    }),
    prisma.member.findMany({
      where: { organizationId: orgId, status: "ACTIVE", deletedAt: null },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.userOrganization.findMany({
      where: { organizationId: orgId, role: { not: "MEMBER" } },
      select: { userId: true, user: { select: { name: true, email: true } } },
    }),
  ]);

  const staffMap: Record<string, string> = {};
  for (const s of staffRows) staffMap[s.userId] = s.user.name ?? s.user.email;

  return (
    <ProServicesView
      currency={ctx.organization.currency}
      currentUserId={ctx.user.id}
      staff={staffRows.map((s) => ({ userId: s.userId, name: s.user.name ?? s.user.email })) as any}
      staffMap={staffMap}
      members={members.map((m) => ({ id: m.id, name: m.user.name ?? m.user.email, jurisdiction: undefined })) as any}
      requests={requests.map((r) => ({
        id: r.id,
        memberName: r.member.user.name ?? r.member.user.email,
        serviceType: r.serviceType,
        jurisdiction: r.jurisdiction,
        stage: r.stage,
        urgency: r.urgency,
        governingBody: r.governingBody,
        referenceNumber: r.referenceNumber,
        assignedTo: r.assignedTo,
        fee: r.fee == null ? null : Number(r.fee),
        currency: r.currency,
        dueDate: r.dueDate?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
      })) as any}
    />
  );
}
