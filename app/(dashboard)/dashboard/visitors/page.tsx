import type { Metadata } from "next";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { VisitorsView } from "@/components/visitors/visitors-view";
import { startOfDay, endOfDay } from "date-fns";

export const metadata: Metadata = { title: "Visitors — CoWork Pro" };
export const dynamic = "force-dynamic";

export default async function VisitorsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const userOrg = { organizationId: ctx.organizationId };

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const [visitors, members, todayCount, currentlyInCount] = await Promise.all([
    prisma.visitor.findMany({
      where: { organizationId: userOrg.organizationId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.member.findMany({
      where: { organizationId: userOrg.organizationId, status: "ACTIVE", deletedAt: null },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.visitor.count({
      where: { organizationId: userOrg.organizationId, createdAt: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.visitor.count({
      where: { organizationId: userOrg.organizationId, checkedInAt: { not: null }, checkedOutAt: null },
    }),
  ]);

  return (
    <VisitorsView
      initialVisitors={visitors as any}
      members={members as any}
      todayCount={todayCount}
      currentlyInCount={currentlyInCount}
    />
  );
}
