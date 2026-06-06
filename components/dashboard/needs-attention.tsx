"use client";

import Link from "next/link";
import { Clock, AlertCircle, Receipt, ChevronRight, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Props = {
  pendingApprovals: number;
  overdueCount: number;
  overdueAmount: number;
  unbilled: number;
  currency: string;
};

export function NeedsAttention({ pendingApprovals, overdueCount, overdueAmount, unbilled, currency }: Props) {
  const items = [
    pendingApprovals > 0 && {
      key: "pending",
      href: "/dashboard/bookings",
      icon: Clock,
      tint: "#F59E0B",
      bg: "bg-amber-50",
      title: `${pendingApprovals} booking${pendingApprovals !== 1 ? "s" : ""} pending approval`,
      sub: "Review and confirm",
    },
    overdueCount > 0 && {
      key: "overdue",
      href: "/dashboard/invoices?status=OVERDUE",
      icon: AlertCircle,
      tint: "#EF4444",
      bg: "bg-red-50",
      title: `${formatCurrency(overdueAmount, currency)} overdue`,
      sub: `${overdueCount} invoice${overdueCount !== 1 ? "s" : ""} past due`,
    },
    unbilled > 0 && {
      key: "unbilled",
      href: "/dashboard/invoices",
      icon: Receipt,
      tint: "#6366F1",
      bg: "bg-indigo-50",
      title: `${formatCurrency(unbilled, currency)} ready to invoice`,
      sub: "Unbilled bookings",
    },
  ].filter(Boolean) as {
    key: string; href: string; icon: any; tint: string; bg: string; title: string; sub: string;
  }[];

  if (items.length === 0) {
    return (
      <div className="dashboard-card p-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">You're all caught up</p>
          <p className="text-xs text-gray-400">No approvals, overdue invoices, or unbilled charges.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">Needs attention</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((it) => (
          <Link key={it.key} href={it.href}
            className="dashboard-card p-4 flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all group">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${it.bg}`}>
              <it.icon style={{ color: it.tint, width: 17, height: 17 }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{it.title}</p>
              <p className="text-xs text-gray-400">{it.sub}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
