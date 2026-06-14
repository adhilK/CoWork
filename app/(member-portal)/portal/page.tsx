import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, startOfMonth } from "date-fns";
import { MemberDashboard } from "@/components/portal/member-dashboard";

export const metadata: Metadata = { title: "My Dashboard — CoWork Pro" };
export const dynamic = "force-dynamic";

export default async function PortalHomePage({
  searchParams,
}: {
  searchParams: { welcome?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const member = await prisma.member.findFirst({
    where: { userId: user.id, deletedAt: null },
    include: { user: true, organization: true, membershipPlan: true },
  });
  if (!member) redirect("/login");

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const monthStart = startOfMonth(now);

  const todayBookings = await prisma.booking.findMany({
    where: {
      memberId: member.id,
      organizationId: member.organizationId,
      deletedAt: null,
      startTime: { gte: todayStart, lte: todayEnd },
      status: { in: ["CONFIRMED", "CHECKED_IN", "PENDING"] },
    },
    include: { resource: { select: { name: true, type: true } } },
    orderBy: { startTime: "asc" },
  });

  const upcomingBookings = await prisma.booking.findMany({
    where: {
      memberId: member.id,
      organizationId: member.organizationId,
      deletedAt: null,
      startTime: { gt: now },
      status: { in: ["CONFIRMED", "PENDING"] },
    },
    include: { resource: { select: { name: true, type: true } } },
    orderBy: { startTime: "asc" },
    take: 3,
  });

  const bookingsThisMonth = await prisma.booking.count({
    where: {
      memberId: member.id,
      organizationId: member.organizationId,
      deletedAt: null,
      startTime: { gte: monthStart },
      status: { in: ["CONFIRMED", "CHECKED_IN", "COMPLETED", "PENDING"] },
    },
  });

  const announcements = await prisma.announcement.findMany({
    where: { organizationId: member.organizationId },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take: 3,
  });

  // Only surface Documents / PRO Services quick actions if the member uses them.
  const [docCount, proCount] = await Promise.all([
    prisma.document.count({ where: { memberId: member.id, deletedAt: null } }),
    prisma.proServiceRequest.count({ where: { memberId: member.id, deletedAt: null } }),
  ]);

  return (
    <MemberDashboard
      memberName={member.user.name}
      credits={member.credits}
      todayBookings={todayBookings as any}
      upcomingBookings={upcomingBookings as any}
      bookingsThisMonth={bookingsThisMonth}
      announcements={announcements}
      isNewMember={searchParams.welcome === "1"}
      hasDocuments={docCount > 0}
      hasProServices={proCount > 0}
    />
  );
}
