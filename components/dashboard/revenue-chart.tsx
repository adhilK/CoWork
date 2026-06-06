"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { format, parseISO } from "date-fns";

type DataPoint = { date: string; revenue: number };
type Props = { data: DataPoint[]; currency: string };

const CustomBar = (props: any) => {
  const { x, y, width, height } = props;
  if (height <= 0) return null;
  const r = Math.min(4, height / 2);
  return (
    <path
      d={`M${x},${y + height} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height} Z`}
      fill={props.fill}
    />
  );
};

export function RevenueChart({ data, currency }: Props) {
  const total = data.reduce((s, d) => s + d.revenue, 0);
  const maxVal = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div className="dashboard-card p-5">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Revenue Trend</h2>
          <p className="text-xs text-gray-400 mt-0.5">Paid invoices · last 30 days</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-gray-900">{formatCurrency(total, currency)}</p>
          <p className="text-xs text-gray-400">total</p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-48 flex flex-col items-center justify-center text-gray-400">
          <p className="text-sm">No revenue data yet</p>
          <p className="text-xs mt-1">Revenue will appear once invoices are marked paid</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="0" stroke="#F3F4F6" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#9CA3AF" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => format(parseISO(v), "d MMM")}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#9CA3AF" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`}
              width={36}
            />
            <Tooltip
              cursor={{ fill: "rgba(0,0,0,0.04)", radius: 6 }}
              contentStyle={{
                background: "#0A0F0A",
                border: "none",
                borderRadius: 10,
                fontSize: 12,
                color: "#fff",
                boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
                padding: "8px 12px",
              }}
              labelStyle={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginBottom: 2 }}
              itemStyle={{ color: "#4ADE80", fontWeight: 600 }}
              formatter={(v: any) => [formatCurrency(v as number, currency), ""]}
              labelFormatter={(l) => format(parseISO(l as string), "d MMM yyyy")}
            />
            <Bar dataKey="revenue" shape={<CustomBar />} radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.revenue === maxVal ? "#22C55E" : "rgba(34,197,94,0.35)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
