import type { Metadata } from "next";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PlansView } from "@/components/plans/plans-view";

export const metadata: Metadata = { title: "Plans — Maktaby" };
export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const userOrg = { organizationId: ctx.organizationId, organization: ctx.organization };

  const plans = await prisma.membershipPlan.findMany({
    where: { organizationId: userOrg.organizationId },
    include: { _count: { select: { members: true } } },
    orderBy: { price: "asc" },
  });

  return (
    <PlansView
      initialPlans={plans as any}
      currency={userOrg.organization.currency}
    />
  );
}
