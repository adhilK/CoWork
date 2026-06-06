import type { Metadata } from "next";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AnalyticsView } from "@/components/analytics/analytics-view";
import { startOfMonth, subMonths, endOfMonth } from "date-fns";

export const metadata: Metadata = { title: "Analytics — CoWork Pro" };
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const userOrg = { organizationId: ctx.organizationId, organization: ctx.organization };

  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const start = startOfMonth(subMonths(now, 5 - i));
    const end = endOfMonth(start);
    return { start, end, label: start.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }) };
  });

  const [revenueByMonth, bookingsByMonth, memberGrowth, resourceStats] = await Promise.all([
    // Revenue by month (last 6)
    Promise.all(months.map(async (m) => {
      const agg = await prisma.invoice.aggregate({
        where: { organizationId: userOrg.organizationId, status: "PAID", paidAt: { gte: m.start, lte: m.end } },
        _sum: { amount: true },
      });
      return { month: m.label, revenue: Number(agg._sum.amount ?? 0) };
    })),
    // Bookings by month
    Promise.all(months.map(async (m) => {
      const count = await prisma.booking.count({
        where: {
          organizationId: userOrg.organizationId,
          startTime: { gte: m.start, lte: m.end },
          status: { in: ["CONFIRMED", "CHECKED_IN", "COMPLETED"] },
          deletedAt: null,
        },
      });
      return { month: m.label, bookings: count };
    })),
    // Member growth
    Promise.all(months.map(async (m) => {
      const count = await prisma.member.count({
        where: {
          organizationId: userOrg.organizationId,
          createdAt: { lte: m.end },
          deletedAt: null,
        },
      });
      return { month: m.label, members: count };
    })),
    // Resource utilization
    prisma.resource.findMany({
      where: { organizationId: userOrg.organizationId, isActive: true, deletedAt: null },
      include: {
        _count: { select: { bookings: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <AnalyticsView
      revenueByMonth={revenueByMonth}
      bookingsByMonth={bookingsByMonth}
      memberGrowth={memberGrowth}
      resourceStats={resourceStats.map((r) => ({
        name: r.name,
        type: r.type,
        bookings: r._count.bookings,
      }))}
      currency={userOrg.organization.currency}
    />
  );
}
