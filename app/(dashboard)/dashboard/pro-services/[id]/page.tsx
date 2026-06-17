import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can, homePathForRole } from "@/lib/permissions";
import { ProServiceDetailView } from "@/components/pro-services/pro-service-detail-view";

export const metadata: Metadata = { title: "PRO Service â€” Maktaby" };
export const dynamic = "force-dynamic";

export default async function ProServiceDetailPage({ params }: { params: { id: string } }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (!can(ctx.role, "proServices")) redirect(homePathForRole(ctx.role));
  const orgId = ctx.organizationId;

  const [req, staffRows] = await Promise.all([
    prisma.proServiceRequest.findFirst({
      where: { id: params.id, organizationId: orgId, deletedAt: null },
      include: {
        activities: { orderBy: { createdAt: "desc" } },
        member: { include: { user: { select: { name: true, email: true } } } },
      },
    }),
    prisma.userOrganization.findMany({
      where: { organizationId: orgId },
      select: { userId: true, role: true, user: { select: { name: true, email: true } } },
    }),
  ]);
  if (!req) notFound();

  const staffMap: Record<string, string> = {};
  for (const s of staffRows) staffMap[s.userId] = s.user.name ?? s.user.email;
  const staff = staffRows.filter((s) => s.role !== "MEMBER").map((s) => ({ userId: s.userId, name: s.user.name ?? s.user.email }));

  return (
    <ProServiceDetailView
      staff={staff as any}
      staffMap={staffMap}
      request={{
        id: req.id,
        memberId: req.memberId,
        memberName: req.member.user.name ?? req.member.user.email,
        serviceType: req.serviceType,
        serviceDescription: req.serviceDescription,
        jurisdiction: req.jurisdiction,
        stage: req.stage,
        urgency: req.urgency,
        governingBody: req.governingBody,
        referenceNumber: req.referenceNumber,
        assignedTo: req.assignedTo,
        fee: req.fee == null ? null : Number(req.fee),
        currency: req.currency,
        slaDays: req.slaDays,
        dueDate: req.dueDate?.toISOString() ?? null,
        completedAt: req.completedAt?.toISOString() ?? null,
        cancelReason: req.cancelReason,
        clientNotes: req.clientNotes,
        internalNotes: req.internalNotes,
        createdAt: req.createdAt.toISOString(),
        activities: req.activities.map((a) => ({
          id: a.id, userId: a.userId, note: a.note, stage: a.stage,
          isClientVisible: a.isClientVisible, createdAt: a.createdAt.toISOString(),
        })),
      } as any}
    />
  );
}