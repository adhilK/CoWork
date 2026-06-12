import type { Metadata } from "next";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { VisitorsView } from "@/components/visitors/visitors-view";
import { decryptField } from "@/lib/encryption";
import { startOfDay, endOfDay } from "date-fns";

export const metadata: Metadata = { title: "Visitors — CoWork Pro" };
export const dynamic = "force-dynamic";

export default async function VisitorsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const orgId = ctx.organizationId;

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const [visitors, members, deliveries, todayCount, currentlyInCount, blacklistCount, pendingDeliveries] = await Promise.all([
    prisma.visitor.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 150,
    }),
    prisma.member.findMany({
      where: { organizationId: orgId, status: "ACTIVE", deletedAt: null },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.delivery.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { receivedAt: "desc" },
      take: 150,
      include: { member: { include: { user: { select: { name: true, email: true } } } } },
    }),
    prisma.visitor.count({
      where: { organizationId: orgId, deletedAt: null, createdAt: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.visitor.count({
      where: { organizationId: orgId, deletedAt: null, checkedInAt: { not: null }, checkedOutAt: null },
    }),
    prisma.visitor.count({
      where: { organizationId: orgId, deletedAt: null, isBlacklisted: true },
    }),
    prisma.delivery.count({
      where: { organizationId: orgId, deletedAt: null, collectedAt: null },
    }),
  ]);

  // Decrypt ID numbers for the reception desk (staff-only page).
  const decryptedVisitors = visitors.map((v) => ({ ...v, idNumber: decryptField(v.idNumber) }));

  return (
    <VisitorsView
      initialVisitors={decryptedVisitors as any}
      members={members as any}
      deliveries={deliveries as any}
      stats={{
        today: todayCount,
        onSite: currentlyInCount,
        blacklisted: blacklistCount,
        pendingDeliveries,
      }}
    />
  );
}
