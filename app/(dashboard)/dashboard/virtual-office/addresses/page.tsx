import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AddressesView } from "@/components/virtual-office/addresses-view";

export const metadata: Metadata = { title: "Addresses — Virtual Office — Maktaby" };
export const dynamic = "force-dynamic";

export default async function AddressesPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const addresses = await prisma.virtualOfficeAddress.findMany({
    where: { organizationId: ctx.organizationId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    include: {
      _count: {
        select: { subscriptions: { where: { status: "ACTIVE", deletedAt: null } } },
      },
    },
  });

  return <AddressesView addresses={addresses as any} currency={ctx.organization.currency} />;
}
