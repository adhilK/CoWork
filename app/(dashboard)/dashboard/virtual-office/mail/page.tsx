import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MailView } from "@/components/virtual-office/mail-view";

export const metadata: Metadata = { title: "Mail Log — Virtual Office — CoWork Pro" };
export const dynamic = "force-dynamic";

export default async function MailPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const orgId = ctx.organizationId;

  const [mailItems, addresses, subscriptions] = await Promise.all([
    prisma.mailItem.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { receivedAt: "desc" },
      take: 200,
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
    prisma.virtualOfficeAddress.findMany({
      where: { organizationId: orgId, isActive: true, deletedAt: null },
      orderBy: { createdAt: "asc" },
    }),
    prisma.virtualOfficeSubscription.findMany({
      where: { organizationId: orgId, status: "ACTIVE", deletedAt: null },
      orderBy: { companyName: "asc" },
      include: {
        member: { include: { user: { select: { name: true, email: true } } } },
      },
    }),
  ]);

  return (
    <MailView
      mailItems={mailItems as any}
      addresses={addresses as any}
      subscriptions={subscriptions as any}
    />
  );
}
