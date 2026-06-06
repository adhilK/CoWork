"use client";

import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import type { ResourceType } from "@prisma/client";

type Props = {
  revenueByMonth: { month: string; revenue: number }[];
  bookingsByMonth: { month: string; bookings: number }[];
  memberGrowth: { month: string; members: number }[];
  resourceStats: { name: string; type: ResourceType; bookings: number }[];
  currency: string;
};

export function AnalyticsView({ revenueByMonth, bookingsByMonth, memberGrowth, resourceStats, currency }: Props) {
  // Merge revenue + bookings for combined chart
  const combinedData = revenueByMonth.map((r, i) => ({
    month: r.month,
    revenue: r.revenue,
    bookings: bookingsByMonth[i]?.bookings ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">6-month performance overview</p>
      </div>

      {/* Revenue + Bookings */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="dashboard-card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Revenue by month</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} tickLine={false} axisLine={false}
                tickFormatter={(v) => `£${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} width={44} />
              <Tooltip
                contentStyle={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 12 }}
                formatter={(v: any) => [formatCurrency(v as number, currency), "Revenue"]}
              />
              <Bar dataKey="revenue" fill="#22C55E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="dashboard-card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Member growth</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={memberGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} tickLine={false} axisLine={false} width={32} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="members" stroke="#6366F1" strokeWidth={2} dot={false}
                activeDot={{ r: 4, fill: "#6366F1" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bookings over time */}
      <div className="dashboard-card p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Bookings by month</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={bookingsByMonth}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} tickLine={false} axisLine={false} width={32} />
            <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="bookings" fill="#6366F1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Resource utilization */}
      <div className="dashboard-card p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Resource utilization (all-time bookings)</h2>
        <div className="space-y-3">
          {resourceStats.sort((a, b) => b.bookings - a.bookings).map((r) => {
            const max = Math.max(...resourceStats.map((x) => x.bookings), 1);
            return (
              <div key={r.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 font-medium">{r.name}</span>
                  <span className="text-gray-500">{r.bookings} bookings</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all"
                    style={{ width: `${Math.max(2, (r.bookings / max) * 100)}%` }} />
                </div>
              </div>
            );
          })}
          {resourceStats.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No data yet</p>}
        </div>
      </div>
    </div>
  );
}
