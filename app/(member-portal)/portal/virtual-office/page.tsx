import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { MemberVOView } from "@/components/virtual-office/member-vo-view";

export const metadata: Metadata = { title: "Virtual Office — CoWork Pro" };
export const dynamic = "force-dynamic";

export default async function PortalVirtualOfficePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const member = await prisma.member.findFirst({
    where: { userId: user.id, deletedAt: null },
    select: { id: true, organizationId: true },
  });
  if (!member) redirect("/login");

  const [subscriptions, recentMail] = await Promise.all([
    prisma.virtualOfficeSubscription.findMany({
      where: { memberId: member.id, organizationId: member.organizationId, deletedAt: null },
      orderBy: { startDate: "desc" },
      include: {
        address: {
          select: {
            addressLine: true,
            addressType: true,
            jurisdiction: true,
            freezoneName: true,
          },
        },
      },
    }),
    prisma.mailItem.findMany({
      where: {
        organizationId: member.organizationId,
        subscription: { memberId: member.id },
        deletedAt: null,
      },
      orderBy: { receivedAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <MemberVOView
      subscriptions={subscriptions as any}
      recentMail={recentMail as any}
    />
  );
}
