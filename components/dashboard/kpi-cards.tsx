"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, Users, CalendarCheck, UserCheck, Landmark, Stamp } from "lucide-react";
import { formatCurrency, formatTrend, cn } from "@/lib/utils";

type KPI = {
  revenue: { current: number; previous: number; trend: number[]; unbilled?: number };
  activeMembers: { current: number; previous: number };
  todayBookings: { total: number; pending: number };
  occupancyRate?: number;
  onSiteNow?: number;
  bizLeadsActive?: number;
  proServicesOpen?: number;
};

type Props = { kpi: KPI; currency: string; businessType?: string | null };

/** Tiny inline bar sparkline — pure SVG, no deps */
function MiniBarChart({ values, color, height = 30 }: { values: number[]; color: string; height?: number }) {
  const max = Math.max(...values, 1);
  const w = 5, gap = 3, total = values.length;
  const svgW = total * (w + gap) - gap;
  return (
    <svg width={svgW} height={height} viewBox={`0 0 ${svgW} ${height}`} style={{ display: "block" }}>
      {values.map((v, i) => {
        const barH = Math.max(2, Math.round((v / max) * height));
        const isLast = i === total - 1;
        return <rect key={i} x={i * (w + gap)} y={height - barH} width={w} height={barH} rx={2}
          fill={isLast ? color : `${color}55`} />;
      })}
    </svg>
  );
}

function TrendLabel({ current, previous }: { current: number; previous: number }) {
  // No prior-month data to compare against — show a friendly label instead of "—".
  if (previous === 0) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold",
        current > 0 ? "text-emerald-600" : "text-gray-400")}>
        {current > 0 ? <TrendingUp className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
        <span className="hidden sm:inline">{current > 0 ? "New this month" : "No data yet"}</span>
        <span className="sm:hidden">{current > 0 ? "New" : "—"}</span>
      </span>
    );
  }
  const { label, direction } = formatTrend(current, previous);
  const Icon = direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Minus;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[11px] font-semibold",
      direction === "up" && "text-emerald-600",
      direction === "down" && "text-red-500",
      direction === "flat" && "text-gray-400",
    )}>
      <Icon className="w-3 h-3" />
      <span className="hidden sm:inline">{label} vs last month</span>
      <span className="sm:hidden">{label}</span>
    </span>
  );
}

export function KPICards({ kpi, currency, businessType }: Props) {
  const isBizCenter = businessType === "Business Center";
  const revTrend = kpi.revenue.trend?.length ? kpi.revenue.trend : [0, 0, 0, 0, 0, 0, kpi.revenue.current];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
      {/* Revenue — dark card (same for all types) */}
      <Link href="/dashboard/invoices" className="kpi-card kpi-card-dark rounded-2xl p-3 sm:p-5 block hover:-translate-y-0.5 transition-transform">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] sm:text-xs font-medium mb-1.5 sm:mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
              <span className="hidden sm:inline">Revenue this month</span>
              <span className="sm:hidden">Revenue</span>
            </p>
            <p className="text-lg sm:text-2xl font-bold tracking-tight text-white mb-1 sm:mb-1.5 truncate">{formatCurrency(kpi.revenue.current, currency)}</p>
            <TrendLabel current={kpi.revenue.current} previous={kpi.revenue.previous} />
            {(kpi.revenue.unbilled ?? 0) > 0 && (
              <p className="text-[10px] mt-1 sm:mt-1.5 font-medium hidden sm:block" style={{ color: "rgba(255,255,255,0.5)" }}>
                + {formatCurrency(kpi.revenue.unbilled!, currency)} unbilled
              </p>
            )}
          </div>
          <div className="hidden sm:block flex-shrink-0 self-end pb-0.5"><MiniBarChart values={revTrend} color="#22C55E" /></div>
        </div>
      </Link>

      {/* Members / Clients */}
      <Link href="/dashboard/members" className="kpi-card rounded-2xl p-3 sm:p-5 block hover:-translate-y-0.5 transition-transform">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] sm:text-xs font-medium text-gray-400 mb-1.5 sm:mb-2">
              <span className="hidden sm:inline">{isBizCenter ? "Active clients" : "Active members"}</span>
              <span className="sm:hidden">{isBizCenter ? "Clients" : "Members"}</span>
            </p>
            <p className="text-lg sm:text-2xl font-bold tracking-tight text-gray-900 mb-1 sm:mb-1.5">{kpi.activeMembers.current}</p>
            <TrendLabel current={kpi.activeMembers.current} previous={kpi.activeMembers.previous} />
          </div>
          <div className="hidden sm:flex w-9 h-9 rounded-xl bg-indigo-50 items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
        </div>
      </Link>

      {/* Open leads (BC) | Today's bookings (CW) */}
      {isBizCenter ? (
        <Link href="/dashboard/business-setup/leads" className="kpi-card rounded-2xl p-3 sm:p-5 block hover:-translate-y-0.5 transition-transform">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] sm:text-xs font-medium text-gray-400 mb-1.5 sm:mb-2">
                <span className="hidden sm:inline">Open leads</span>
                <span className="sm:hidden">Leads</span>
              </p>
              <p className="text-lg sm:text-2xl font-bold tracking-tight text-gray-900 mb-1 sm:mb-1.5">{kpi.bizLeadsActive ?? 0}</p>
              <span className="inline-flex text-[11px] font-medium text-emerald-600">
                <span className="hidden sm:inline">{(kpi.bizLeadsActive ?? 0) > 0 ? "Active in pipeline" : "No open leads"}</span>
                <span className="sm:hidden">{(kpi.bizLeadsActive ?? 0) > 0 ? "In pipeline" : "None"}</span>
              </span>
            </div>
            <div className="hidden sm:flex w-9 h-9 rounded-xl bg-amber-50 items-center justify-center flex-shrink-0">
              <Landmark className="w-4 h-4 text-amber-500" />
            </div>
          </div>
        </Link>
      ) : (
        <Link href="/dashboard/bookings" className="kpi-card rounded-2xl p-3 sm:p-5 block hover:-translate-y-0.5 transition-transform">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] sm:text-xs font-medium text-gray-400 mb-1.5 sm:mb-2">
                <span className="hidden sm:inline">Today&apos;s bookings</span>
                <span className="sm:hidden">Bookings</span>
              </p>
              <p className="text-lg sm:text-2xl font-bold tracking-tight text-gray-900 mb-1 sm:mb-1.5">{kpi.todayBookings.total}</p>
              <span className={cn("inline-flex text-[11px] font-medium",
                kpi.todayBookings.pending > 0 ? "text-amber-600" : "text-emerald-600")}>
                <span className="hidden sm:inline">{kpi.todayBookings.pending > 0 ? `${kpi.todayBookings.pending} pending` : "✓ All confirmed"}</span>
                <span className="sm:hidden">{kpi.todayBookings.pending > 0 ? `${kpi.todayBookings.pending} pending` : "✓ Confirmed"}</span>
              </span>
            </div>
            <div className="hidden sm:flex w-9 h-9 rounded-xl bg-amber-50 items-center justify-center flex-shrink-0">
              <CalendarCheck className="w-4 h-4 text-amber-500" />
            </div>
          </div>
        </Link>
      )}

      {/* PRO services open (BC) | On-site now (CW) — accent green card */}
      {isBizCenter ? (
        <Link href="/dashboard/pro-services" className="kpi-card kpi-card-accent rounded-2xl p-3 sm:p-5 block hover:-translate-y-0.5 transition-transform">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] sm:text-xs font-medium mb-1.5 sm:mb-2" style={{ color: "rgba(255,255,255,0.55)" }}>
                <span className="hidden sm:inline">PRO services open</span>
                <span className="sm:hidden">PRO services</span>
              </p>
              <p className="text-lg sm:text-2xl font-bold tracking-tight text-white mb-1 sm:mb-1.5">{kpi.proServicesOpen ?? 0}</p>
              <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
                <span className="hidden sm:inline">{(kpi.proServicesOpen ?? 0) > 0 ? "In progress" : "All clear"}</span>
                <span className="sm:hidden">{(kpi.proServicesOpen ?? 0) > 0 ? "In progress" : "All clear"}</span>
              </span>
            </div>
            <div className="hidden sm:flex w-9 h-9 rounded-xl items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.15)" }}>
              <Stamp className="w-4 h-4 text-white" />
            </div>
          </div>
        </Link>
      ) : (
        <Link href="/dashboard/bookings" className="kpi-card kpi-card-accent rounded-2xl p-3 sm:p-5 block hover:-translate-y-0.5 transition-transform">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] sm:text-xs font-medium mb-1.5 sm:mb-2" style={{ color: "rgba(255,255,255,0.55)" }}>
                <span className="hidden sm:inline">On-site now</span>
                <span className="sm:hidden">On-site</span>
              </p>
              <p className="text-lg sm:text-2xl font-bold tracking-tight text-white mb-1 sm:mb-1.5">{kpi.onSiteNow ?? 0}</p>
              <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
                <span className="hidden sm:inline">{kpi.occupancyRate != null ? `${kpi.occupancyRate}% occupancy` : "—"}</span>
                <span className="sm:hidden">{kpi.occupancyRate != null ? `${kpi.occupancyRate}%` : "—"}</span>
              </span>
            </div>
            <div className="hidden sm:flex w-9 h-9 rounded-xl items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.15)" }}>
              <UserCheck className="w-4 h-4 text-white" />
            </div>
          </div>
        </Link>
      )}
    </div>
  );
}
