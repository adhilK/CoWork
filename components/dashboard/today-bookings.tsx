"use client";

import { formatTime, formatDuration, initials, cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { BookingStatus } from "@prisma/client";

type Booking = {
  id: string; title: string | null; status: BookingStatus;
  startTime: Date; endTime: Date; attendees: number;
  resource: { name: string; type: string };
  member: { user: { name: string | null } } | null;
};

const STATUS_STYLES: Record<BookingStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  CHECKED_IN: "bg-green-100 text-green-800",
  COMPLETED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-100 text-red-700",
  NO_SHOW: "bg-orange-100 text-orange-700",
};

const STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: "Pending", CONFIRMED: "Confirmed", CHECKED_IN: "Checked in",
  COMPLETED: "Completed", CANCELLED: "Cancelled", NO_SHOW: "No show",
};

export function TodayBookings({ bookings }: { bookings: Booking[] }) {
  return (
    <div className="dashboard-card p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-gray-900">Today&apos;s bookings</h2>
        <a href="/dashboard/bookings" className="text-sm font-medium" style={{ color: "#22C55E" }}>
          View all →
        </a>
      </div>

      {bookings.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No bookings today</p>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <div key={b.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
              <Avatar className="w-9 h-9 flex-shrink-0">
                <AvatarFallback className="text-xs font-bold bg-green-100 text-green-700">
                  {initials(b.member?.user?.name ?? "?")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {b.title ?? b.resource.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatTime(b.startTime)} – {formatTime(b.endTime)} · {b.resource.name}
                </p>
              </div>
              <Badge className={cn("text-xs font-medium shrink-0", STATUS_STYLES[b.status])}>
                {STATUS_LABELS[b.status]}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
