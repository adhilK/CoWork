import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ChevronLeft, Users, Clock, MapPin, Banknote, CalendarDays, TrendingUp } from "lucide-react";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency, humanizeEnum, cn } from "@/lib/utils";
import { ResourceActions } from "@/components/resources/resource-actions";
import { ResourceIcon } from "@/components/shared/resource-icon";
import { startOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay, format } from "date-fns";

export const metadata: Metadata = { title: "Resource â€” Maktaby" };
export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; bg: string; text: string; solid: string }> = {
  PENDING:    { label: "Pending",    bg: "bg-amber-50",   text: "text-amber-700",   solid: "#F59E0B" },
  CONFIRMED:  { label: "Confirmed",  bg: "bg-indigo-50",  text: "text-indigo-700",  solid: "#6366F1" },
  CHECKED_IN: { label: "Checked in", bg: "bg-emerald-50", text: "text-emerald-700", solid: "#16A34A" },
  COMPLETED:  { label: "Completed",  bg: "bg-gray-100",   text: "text-gray-500",    solid: "#9CA3AF" },
};
const DEFAULT_STATUS = STATUS.CONFIRMED!;

export default async function ResourceDetailPage({ params }: { params: { id: string } }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const orgId = ctx.organizationId;
  const currency = ctx.organization.currency;

  const now = new Date();
  const monthStart = startOfMonth(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const [resource, upcoming, monthBookings, currentBooking] = await Promise.all([
    prisma.resource.findFirst({
      where: { id: params.id, organizationId: orgId, deletedAt: null },
      include: { location: { select: { name: true } } },
    }),
    prisma.booking.findMany({
      where: {
        resourceId: params.id, organizationId: orgId, deletedAt: null,
        status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
        endTime: { gte: now },
      },
      include: { member: { select: { user: { select: { name: true, email: true } } } } },
      orderBy: { startTime: "asc" },
      take: 12,
    }),
    prisma.booking.findMany({
      where: {
        resourceId: params.id, organizationId: orgId, deletedAt: null,
        startTime: { gte: monthStart },
        status: { in: ["CONFIRMED", "CHECKED_IN", "COMPLETED"] },
      },
      select: { startTime: true, endTime: true, amountCharged: true },
    }),
    prisma.booking.findFirst({
      where: {
        resourceId: params.id, organizationId: orgId, deletedAt: null,
        status: { in: ["CONFIRMED", "CHECKED_IN"] },
        startTime: { lte: now }, endTime: { gte: now },
      },
      select: { endTime: true },
    }),
  ]);

  if (!resource) notFound();

  // Stats â€” derived from a single source (monthBookings) to avoid double counting
  const todayCount = monthBookings.filter((b) => b.startTime >= todayStart && b.startTime <= todayEnd).length;
  const weekCount = monthBookings.filter((b) => b.startTime >= weekStart && b.startTime <= weekEnd).length;
  const monthHours = monthBookings.reduce((s, b) => s + (b.endTime.getTime() - b.startTime.getTime()) / 3600000, 0);
  const maxHours = 8 * 22;
  const utilization = Math.min(100, Math.round((monthHours / maxHours) * 100));
  const monthRevenue = monthBookings.reduce((s, b) => s + Number(b.amountCharged), 0);

  const isOccupied = !!currentBooking;

  const stats = [
    { icon: CalendarDays, tint: "#6366F1", label: "Today", value: String(todayCount) },
    { icon: Clock, tint: "#0EA5E9", label: "This week", value: String(weekCount) },
    { icon: TrendingUp, tint: "#F59E0B", label: "Utilization", value: `${utilization}%` },
    { icon: Banknote, tint: "#15803D", label: "Revenue (mo)", value: formatCurrency(monthRevenue, currency) },
  ];

  return (
    <div className="space-y-5">
      <Link href="/dashboard/resources" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors">
        <ChevronLeft className="w-4 h-4 mr-1" /> Back to resources
      </Link>

      {/* Header */}
      <div className="dashboard-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <ResourceIcon type={resource.type} size="lg" />
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">{resource.name}</h1>
            <p className="text-sm text-gray-400 flex items-center gap-2 mt-0.5">
              {humanizeEnum(resource.type)}
              <span className="text-gray-300">Â·</span>
              <MapPin className="w-3.5 h-3.5" /> {resource.location.name}
            </p>
            <div className="mt-2">
              {!resource.isActive ? (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">Disabled</span>
              ) : isOccupied ? (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600 inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  In use until {format(currentBooking!.endTime, "HH:mm")}
                </span>
              ) : (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Available now
                </span>
              )}
            </div>
          </div>
        </div>
        <ResourceActions resourceId={resource.id} isActive={resource.isActive} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="dashboard-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${s.tint}14` }}>
                <s.icon style={{ color: s.tint, width: 15, height: 15 }} />
              </div>
              <span className="text-xs text-gray-500">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Upcoming bookings */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">Upcoming bookings</h2>
            <Link href="/dashboard/bookings" className="text-xs text-indigo-600 hover:underline">Manage in Bookings â†’</Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="dashboard-card p-8 text-center text-gray-400">
              <CalendarDays className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No upcoming bookings for this resource.</p>
            </div>
          ) : (
            <div className="dashboard-card divide-y divide-gray-50 overflow-hidden">
              {upcoming.map((b) => {
                const s = STATUS[b.status] ?? DEFAULT_STATUS;
                return (
                  <div key={b.id} className="flex items-center gap-4 px-4 py-3">
                    <div className="w-14 flex-shrink-0">
                      <p className="text-xs font-semibold text-gray-900">{format(b.startTime, "d MMM")}</p>
                      <p className="text-xs text-gray-400">{format(b.startTime, "HH:mm")}â€“{format(b.endTime, "HH:mm")}</p>
                    </div>
                    <div className="w-1 self-stretch rounded-full" style={{ background: s.solid }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {b.member?.user?.name ?? b.member?.user?.email ?? "Walk-in"}
                      </p>
                      {b.title && <p className="text-xs text-gray-400 truncate">{b.title}</p>}
                    </div>
                    <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", s.bg, s.text)}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-gray-900">Details</h2>
          <div className="dashboard-card p-4 space-y-3 text-sm">
            <Detail label="Capacity" value={`${resource.capacity} ${resource.capacity === 1 ? "person" : "people"}`} icon={Users} />
            {resource.hourlyRate && <Detail label="Hourly rate" value={`${formatCurrency(Number(resource.hourlyRate), currency)}/hr`} icon={Banknote} />}
            {resource.halfDayRate && <Detail label="Half-day rate" value={formatCurrency(Number(resource.halfDayRate), currency)} icon={Banknote} />}
            {resource.fullDayRate && <Detail label="Full-day rate" value={formatCurrency(Number(resource.fullDayRate), currency)} icon={Banknote} />}
            <Detail label="Booking window" value={`Up to ${resource.advanceBookingDays} days ahead`} icon={CalendarDays} />
            <Detail label="Approval" value={resource.requiresApproval ? "Required" : "Instant"} icon={Clock} />
          </div>
          {resource.amenities.length > 0 && (
            <div className="dashboard-card p-4">
              <p className="text-xs font-semibold text-gray-500 mb-2">Amenities</p>
              <div className="flex flex-wrap gap-1.5">
                {resource.amenities.map((a) => (
                  <span key={a} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{a}</span>
                ))}
              </div>
            </div>
          )}
          {resource.description && (
            <div className="dashboard-card p-4">
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Description</p>
              <p className="text-sm text-gray-600">{resource.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-gray-400">
        <Icon className="w-3.5 h-3.5" /> {label}
      </span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  );
}