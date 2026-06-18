import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { PlansView } from "@/components/portal/plans-view";

export const metadata: Metadata = { title: "Membership Plans — Maktaby" };
export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const member = await prisma.member.findFirst({
    where: { userId: user.id, deletedAt: null },
    select: {
      id: true,
      organizationId: true,
      membershipPlanId: true,
      organization: { select: { currency: true } },
    },
  });
  if (!member) redirect("/login");

  const plans = await prisma.membershipPlan.findMany({
    where: { organizationId: member.organizationId, isActive: true },
    orderBy: { price: "asc" },
  });

  const serialized = plans.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    type: p.type,
    price: Number(p.price),
    billingCycle: p.billingCycle,
    includedCredits: p.includedCredits,
    meetingRoomHours: p.meetingRoomHours,
    features: p.features,
    isActive: p.isActive,
  }));

  return (
    <PlansView
      plans={serialized}
      currentPlanId={member.membershipPlanId ?? null}
      currency={member.organization.currency ?? "AED"}
    />
  );
}
