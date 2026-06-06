"use client";

import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from "recharts";
import { formatPercent } from "@/lib/utils";

type DataPoint = { resourceName: string; occupancyRate: number; totalBookings: number };
type Props = { data: DataPoint[] };

const COLORS = ["#22C55E", "#6366F1", "#F59E0B", "#EC4899", "#14B8A6"];

export function OccupancyChart({ data }: Props) {
  const avgOccupancy = data.length
    ? Math.round(data.reduce((s, d) => s + d.occupancyRate, 0) / data.length)
    : 0;

  return (
    <div className="dashboard-card p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">Occupancy (this month)</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Avg: <span className="font-semibold text-gray-900">{formatPercent(avgOccupancy, 0)}</span>
        </p>
      </div>

      <div className="space-y-3">
        {data.map((d, i) => (
          <div key={d.resourceName}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600 truncate">{d.resourceName}</span>
              <span className="font-medium text-gray-900 ml-2">{d.occupancyRate}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${d.occupancyRate}%`,
                  background: COLORS[i % COLORS.length],
                }}
              />
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">No booking data yet</p>
        )}
      </div>
    </div>
  );
}
