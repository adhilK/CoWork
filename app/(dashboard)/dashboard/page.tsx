import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { KPICards } from "@/components/dashboard/kpi-cards";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { TodaySchedule } from "@/components/dashboard/today-schedule";
import { OccupancyChart } from "@/components/dashboard/occupancy-chart";
import { RecentInvoices } from "@/components/dashboard/recent-invoices";
import { NeedsAttention } from "@/components/dashboard/needs-attention";
import { GettingStarted, type SetupStep } from "@/components/dashboard/getting-started";
import { isAdminRole, homePathForRole } from "@/lib/permissions";
import { startOfMonth, subMonths, startOfDay, endOfDay } from "date-fns";

export const metadata: Metadata = { title: "Dashboard — Maktaby" };
export const dynamic = "force-dynamic";

async function getDashboardData(orgId: string) {
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const [
    revenueThis, revenueLast, activeMembersNow, activeMembersLast,
    todayBookings, allBookingsThisMonth, resources, revenueByDay,
    recentInvoices, unbilledAgg, onSiteNow, pendingApprovals, overdueAgg,
  ] = await Promise.all([
    prisma.invoice.aggregate({
      where: { organizationId: orgId, status: "PAID", paidAt: { gte: thisMonthStart } },
      _sum: { amount: true },
    }),
    prisma.invoice.aggregate({
      where: { organizationId: orgId, status: "PAID", paidAt: { gte: lastMonthStart, lt: thisMonthStart } },
      _sum: { amount: true },
    }),
    prisma.member.count({ where: { organizationId: orgId, status: "ACTIVE", deletedAt: null } }),
    prisma.member.count({ where: { organizationId: orgId, status: "ACTIVE", deletedAt: null, createdAt: { lt: lastMonthStart } } }),
    prisma.booking.findMany({
      where: { organizationId: orgId, startTime: { gte: todayStart, lte: todayEnd }, deletedAt: null },
      include: { resource: { select: { name: true, type: true } }, member: { select: { user: { select: { name: true, email: true } } } } },
      orderBy: { startTime: "asc" },
      take: 10,
    }),
    prisma.booking.findMany({
      where: { organizationId: orgId, startTime: { gte: thisMonthStart }, status: { in: ["CONFIRMED", "CHECKED_IN", "COMPLETED"] }, deletedAt: null },
      select: { resourceId: true, startTime: true, endTime: true },
    }),
    prisma.resource.findMany({ where: { organizationId: orgId, isActive: true, deletedAt: null }, select: { id: true, name: true } }),
    prisma.invoice.findMany({
      where: { organizationId: orgId, status: "PAID", paidAt: { gte: subMonths(now, 1) } },
      select: { amount: true, paidAt: true },
      orderBy: { paidAt: "asc" },
    }),
    prisma.invoice.findMany({
      where: { organizationId: orgId, deletedAt: null },
      include: { member: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.booking.aggregate({
      where: { organizationId: orgId, deletedAt: null, invoiceId: null, amountCharged: { gt: 0 }, status: { in: ["CONFIRMED", "CHECKED_IN", "COMPLETED"] } },
      _sum: { amountCharged: true },
    }),
    prisma.booking.count({ where: { organizationId: orgId, deletedAt: null, status: "CHECKED_IN", startTime: { lte: now }, endTime: { gte: now } } }),
    prisma.booking.count({ where: { organizationId: orgId, deletedAt: null, status: "PENDING" } }),
    prisma.invoice.aggregate({
      where: { organizationId: orgId, deletedAt: null, status: { in: ["PENDING", "OVERDUE"] }, dueDate: { lt: now } },
      _sum: { amount: true }, _count: true,
    }),
  ]);

  // Revenue-by-day for chart
  const revenueMap: Record<string, number> = {};
  revenueByDay.forEach((inv) => {
    if (!inv.paidAt) return;
    const day = inv.paidAt.toISOString().split("T")[0]!;
    revenueMap[day] = (revenueMap[day] ?? 0) + Number(inv.amount);
  });
  const revenueChartData = Object.entries(revenueMap).map(([date, revenue]) => ({ date, revenue })).sort((a, b) => a.date.localeCompare(b.date));

  // Occupancy by resource
  const occupancyData = resources.map((r) => {
    const forR = allBookingsThisMonth.filter((b) => b.resourceId === r.id);
    const totalHours = forR.reduce((sum, b) => sum + (b.endTime.getTime() - b.startTime.getTime()) / 3600000, 0);
    return { resourceName: r.name, occupancyRate: Math.min(100, Math.round((totalHours / (8 * 22)) * 100)), totalBookings: forR.length };
  });
  const avgOccupancy = occupancyData.length ? Math.round(occupancyData.reduce((s, r) => s + r.occupancyRate, 0) / occupancyData.length) : 0;

  const last7 = revenueChartData.slice(-7).map((d) => d.revenue);
  while (last7.length < 7) last7.unshift(0);

  return {
    kpi: {
      revenue: { current: Number(revenueThis._sum.amount ?? 0), previous: Number(revenueLast._sum.amount ?? 0), trend: last7, unbilled: Number(unbilledAgg._sum.amountCharged ?? 0) },
      activeMembers: { current: activeMembersNow, previous: activeMembersLast },
      todayBookings: { total: todayBookings.length, pending: todayBookings.filter((b) => b.status === "PENDING").length },
      occupancyRate: avgOccupancy,
      onSiteNow,
    },
    attention: {
      pendingApprovals,
      overdueCount: overdueAgg._count,
      overdueAmount: Number(overdueAgg._sum.amount ?? 0),
      unbilled: Number(unbilledAgg._sum.amountCharged ?? 0),
    },
    todaySchedule: todayBookings.map((b) => ({
      id: b.id, title: b.title, status: b.status,
      startTime: b.startTime.toISOString(), endTime: b.endTime.toISOString(),
      attendees: b.attendees,
      resourceName: b.resource?.name ?? "Resource",
      resourceType: b.resource?.type ?? ("OTHER" as const),
      memberName: b.member?.user?.name ?? b.member?.user?.email ?? null,
    })),
    revenueChartData,
    occupancyData,
    recentInvoices: recentInvoices.map((inv) => ({ ...inv, amount: Number(inv.amount) })),
  };
}

async function getSetupSteps(orgId: string, businessType: string | null): Promise<{ steps: SetupStep[]; essentialsDone: boolean }> {
  const isBizCenter = businessType === "Business Center";

  const [locationCount, resourceCount, planCount, memberCount, bookingCount, waConfig, staffCount, org, bizLeadCount, voAddressCount] = await Promise.all([
    prisma.location.count({ where: { organizationId: orgId, deletedAt: null } }),
    prisma.resource.count({ where: { organizationId: orgId, deletedAt: null } }),
    prisma.membershipPlan.count({ where: { organizationId: orgId, isActive: true } }),
    prisma.member.count({ where: { organizationId: orgId, deletedAt: null } }),
    prisma.booking.count({ where: { organizationId: orgId, deletedAt: null } }),
    prisma.whatsAppConfig.findUnique({ where: { organizationId: orgId }, select: { isActive: true } }),
    prisma.userOrganization.count({ where: { organizationId: orgId, role: { not: "MEMBER" } } }),
    prisma.organization.findUnique({ where: { id: orgId }, select: { tapSecretKey: true, moyasarApiKey: true, bankTransferDetails: true } }),
    prisma.businessSetupLead.count({ where: { organizationId: orgId, deletedAt: null } }).catch(() => 0),
    prisma.virtualOfficeAddress.count({ where: { organizationId: orgId, deletedAt: null } }).catch(() => 0),
  ]);

  const paymentsDone = !!(org?.tapSecretKey || org?.moyasarApiKey || org?.bankTransferDetails);

  const steps: SetupStep[] = isBizCenter
    ? [
        { title: "Add your first location", desc: "Set your registered office address.", href: "/dashboard/locations", cta: "Add location", done: locationCount > 0 },
        { title: "Set up virtual office addresses", desc: "Create the registered addresses clients can subscribe to.", href: "/dashboard/virtual-office/addresses", cta: "Add address", done: voAddressCount > 0 },
        { title: "Create a service plan", desc: "Set pricing for virtual office subscriptions and services.", href: "/dashboard/plans", cta: "Create plan", done: planCount > 0 },
        { title: "Set up payments", desc: "Connect Tap, Moyasar, or bank transfer to get paid.", href: "/dashboard/settings", cta: "Set up", done: paymentsDone },
        { title: "Add your first client", desc: "Invite the people who use your services.", href: "/dashboard/members", cta: "Add client", done: memberCount > 0 },
        { title: "Open your first business setup lead", desc: "Start tracking a company formation or license application.", href: "/dashboard/business-setup/leads", cta: "Add lead", done: bizLeadCount > 0 },
        { title: "Connect WhatsApp", desc: "Message clients and automate service reminders.", href: "/dashboard/whatsapp/settings", cta: "Connect", done: !!waConfig?.isActive, optional: true },
        { title: "Invite your team", desc: "Add staff with the right level of access.", href: "/dashboard/settings/team", cta: "Invite team", done: staffCount > 1, optional: true },
      ]
    : [
        { title: "Add your first location", desc: "Set where members check in and book.", href: "/dashboard/locations", cta: "Add location", done: locationCount > 0 },
        { title: "Add desks & meeting rooms", desc: "Create the spaces members can book.", href: "/dashboard/resources", cta: "Add resources", done: resourceCount > 0 },
        { title: "Create a membership plan", desc: "Set the pricing your members are billed on.", href: "/dashboard/plans", cta: "Create plan", done: planCount > 0 },
        { title: "Set up payments", desc: "Connect Tap, Moyasar, or bank transfer to get paid.", href: "/dashboard/settings", cta: "Set up", done: paymentsDone },
        { title: "Add your members", desc: "Invite the people who use your space.", href: "/dashboard/members", cta: "Add members", done: memberCount > 0 },
        { title: "Take your first booking", desc: "Reserve a space to see the calendar in action.", href: "/dashboard/bookings", cta: "Open calendar", done: bookingCount > 0 },
        { title: "Connect WhatsApp", desc: "Message members and automate reminders.", href: "/dashboard/whatsapp/settings", cta: "Connect", done: !!waConfig?.isActive, optional: true },
        { title: "Invite your team", desc: "Add staff with the right level of access.", href: "/dashboard/settings/team", cta: "Invite team", done: staffCount > 1, optional: true },
      ];

  const essentialsDone = steps.filter((s) => !s.optional).every((s) => s.done);
  return { steps, essentialsDone };
}

export default async function DashboardPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  // Focused roles (receptionist, PRO agent) land directly in their work area
  // rather than the operator overview, which they can't act on.
  if (!isAdminRole(ctx.role)) redirect(homePathForRole(ctx.role));

  const data = await getDashboardData(ctx.organizationId);
  const businessType = ctx.organization.businessType;
  // Show the guided setup checklist to operators while setup is incomplete.
  const setup = isAdminRole(ctx.role) ? await getSetupSteps(ctx.organizationId, businessType) : null;
  const currency = ctx.organization.currency;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = ctx.user.name?.split(" ")[0] ?? null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting}{firstName ? `, ${firstName}` : ""} 👋
        </h1>
        <p className="text-gray-400 text-sm mt-1">Here&apos;s what&apos;s happening at {ctx.organization.name} today.</p>
      </div>

      {/* Guided setup — only while incomplete */}
      {setup && !setup.essentialsDone && (
        <GettingStarted steps={setup.steps} orgName={ctx.organization.name} />
      )}

      {/* Glanceable stats */}
      <KPICards kpi={data.kpi} currency={currency} />

      {/* Needs attention */}
      <NeedsAttention {...data.attention} currency={currency} />

      {/* Today + recent invoices */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2">
          <TodaySchedule bookings={data.todaySchedule as any} />
        </div>
        <RecentInvoices invoices={data.recentInvoices as any} currency={currency} />
      </div>

      {/* Trends */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2">
          <RevenueChart data={data.revenueChartData} currency={currency} />
        </div>
        <OccupancyChart data={data.occupancyData} />
      </div>
    </div>
  );
}
