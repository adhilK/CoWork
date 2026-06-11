import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VOOverview } from "@/components/virtual-office/vo-overview";

export const metadata: Metadata = { title: "Virtual Office — CoWork Pro" };
export const dynamic = "force-dynamic";

export default async function VirtualOfficePage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const orgId = ctx.organizationId;
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [addresses, subscriptions, recentMail, pendingMailCount, renewingSoonCount] = await Promise.all([
    prisma.virtualOfficeAddress.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { subscriptions: { where: { status: "ACTIVE", deletedAt: null } } } },
      },
    }),
    prisma.virtualOfficeSubscription.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { renewalDate: "asc" },
      include: {
        member: { include: { user: { select: { name: true, email: true } } } },
        address: { select: { id: true, addressLine: true, addressType: true, jurisdiction: true } },
      },
    }),
    prisma.mailItem.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { receivedAt: "desc" },
      take: 15,
      include: {
        address: { select: { id: true, addressLine: true } },
        subscription: {
          select: {
            id: true,
            companyName: true,
            member: { include: { user: { select: { name: true, email: true } } } },
          },
        },
      },
    }),
    prisma.mailItem.count({
      where: { organizationId: orgId, deletedAt: null, collectedAt: null, forwardedAt: null },
    }),
    prisma.virtualOfficeSubscription.count({
      where: { organizationId: orgId, deletedAt: null, status: { in: ["ACTIVE", "PENDING_RENEWAL"] }, renewalDate: { lte: in30Days } },
    }),
  ]);

  const activeSubscriptions = subscriptions.filter((s) => s.status === "ACTIVE");
  const monthlyRevenue = activeSubscriptions.reduce((sum, s) => sum + Number(s.monthlyFee), 0);

  return (
    <VOOverview
      addresses={addresses as any}
      subscriptions={subscriptions as any}
      recentMail={recentMail as any}
      currency={ctx.organization.currency}
      stats={{
        totalAddresses: addresses.length,
        activeSubscriptions: activeSubscriptions.length,
        pendingMailCount,
        renewingSoonCount,
        monthlyRevenue,
      }}
    />
  );
}
