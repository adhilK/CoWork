import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubscriptionsView } from "@/components/virtual-office/subscriptions-view";

export const metadata: Metadata = { title: "Subscriptions — Virtual Office — Maktaby" };
export const dynamic = "force-dynamic";

export default async function SubscriptionsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const orgId = ctx.organizationId;

  const [subscriptions, members, addresses] = await Promise.all([
    prisma.virtualOfficeSubscription.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        member: { include: { user: { select: { name: true, email: true } } } },
        address: { select: { id: true, addressLine: true, addressType: true } },
      },
    }),
    prisma.member.findMany({
      where: { organizationId: orgId, status: "ACTIVE", deletedAt: null },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.virtualOfficeAddress.findMany({
      where: { organizationId: orgId, isActive: true, deletedAt: null },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <SubscriptionsView
      subscriptions={subscriptions as any}
      members={members as any}
      addresses={addresses as any}
      currency={ctx.organization.currency}
    />
  );
}
