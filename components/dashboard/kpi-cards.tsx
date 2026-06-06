"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, Users, CalendarCheck, UserCheck } from "lucide-react";
import { formatCurrency, formatTrend, cn } from "@/lib/utils";

type KPI = {
  revenue: { current: number; previous: number; trend: number[]; unbilled?: number };
  activeMembers: { current: number; previous: number };
  todayBookings: { total: number; pending: number };
  occupancyRate?: number;
  onSiteNow?: number;
};

type Props = { kpi: KPI; currency: string };

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
        {current > 0 ? "New this month" : "No data yet"}
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
      <Icon className="w-3 h-3" /> {label} vs last month
    </span>
  );
}

export function KPICards({ kpi, currency }: Props) {
  const revTrend = kpi.revenue.trend?.length ? kpi.revenue.trend : [0, 0, 0, 0, 0, 0, kpi.revenue.current];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* Revenue — dark card */}
      <Link href="/dashboard/invoices" className="kpi-card kpi-card-dark rounded-2xl p-5 block hover:-translate-y-0.5 transition-transform">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>Revenue this month</p>
            <p className="text-2xl font-bold tracking-tight text-white mb-1.5">{formatCurrency(kpi.revenue.current, currency)}</p>
            <TrendLabel current={kpi.revenue.current} previous={kpi.revenue.previous} />
            {(kpi.revenue.unbilled ?? 0) > 0 && (
              <p className="text-[10px] mt-1.5 font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
                + {formatCurrency(kpi.revenue.unbilled!, currency)} unbilled
              </p>
            )}
          </div>
          <div className="flex-shrink-0 self-end pb-0.5"><MiniBarChart values={revTrend} color="#22C55E" /></div>
        </div>
      </Link>

      {/* Members */}
      <Link href="/dashboard/members" className="kpi-card rounded-2xl p-5 block hover:-translate-y-0.5 transition-transform">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-400 mb-2">Active members</p>
            <p className="text-2xl font-bold tracking-tight text-gray-900 mb-1.5">{kpi.activeMembers.current}</p>
            <TrendLabel current={kpi.activeMembers.current} previous={kpi.activeMembers.previous} />
          </div>
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
        </div>
      </Link>

      {/* Today's bookings */}
      <Link href="/dashboard/bookings" className="kpi-card rounded-2xl p-5 block hover:-translate-y-0.5 transition-transform">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-400 mb-2">Today&apos;s bookings</p>
            <p className="text-2xl font-bold tracking-tight text-gray-900 mb-1.5">{kpi.todayBookings.total}</p>
            <span className={cn("inline-flex text-[11px] font-medium",
              kpi.todayBookings.pending > 0 ? "text-amber-600" : "text-emerald-600")}>
              {kpi.todayBookings.pending > 0 ? `${kpi.todayBookings.pending} pending approval` : "✓ All confirmed"}
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <CalendarCheck className="w-4 h-4 text-amber-500" />
          </div>
        </div>
      </Link>

      {/* On-site now — accent green card */}
      <Link href="/dashboard/bookings" className="kpi-card kpi-card-accent rounded-2xl p-5 block hover:-translate-y-0.5 transition-transform">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium mb-2" style={{ color: "rgba(255,255,255,0.55)" }}>On-site now</p>
            <p className="text-2xl font-bold tracking-tight text-white mb-1.5">{kpi.onSiteNow ?? 0}</p>
            <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
              {kpi.occupancyRate != null ? `${kpi.occupancyRate}% occupancy this month` : "—"}
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.15)" }}>
            <UserCheck className="w-4 h-4 text-white" />
          </div>
        </div>
      </Link>
    </div>
  );
}
