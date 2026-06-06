"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn, LogOut, CalendarDays, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ResourceIcon } from "@/components/shared/resource-icon";
import { format, parseISO } from "date-fns";
import type { ResourceType } from "@prisma/client";

type Booking = {
  id: string; title: string | null; status: string;
  startTime: string; endTime: string; attendees: number;
  resourceName: string; resourceType: ResourceType; memberName: string | null;
};

const STATUS: Record<string, { label: string; text: string; bg: string; solid: string }> = {
  PENDING:    { label: "Pending",    text: "text-amber-700",   bg: "bg-amber-50",   solid: "#F59E0B" },
  CONFIRMED:  { label: "Confirmed",  text: "text-indigo-700",  bg: "bg-indigo-50",  solid: "#6366F1" },
  CHECKED_IN: { label: "Checked in", text: "text-emerald-700", bg: "bg-emerald-50", solid: "#16A34A" },
  COMPLETED:  { label: "Completed",  text: "text-gray-500",    bg: "bg-gray-100",   solid: "#9CA3AF" },
  CANCELLED:  { label: "Cancelled",  text: "text-red-600",     bg: "bg-red-50",     solid: "#EF4444" },
  NO_SHOW:    { label: "No show",    text: "text-orange-600",  bg: "bg-orange-50",  solid: "#F97316" },
};
const DEFAULT_STATUS = STATUS.CONFIRMED!;

export function TodaySchedule({ bookings }: { bookings: Booking[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function quickAction(id: string, action: "check-in" | "check-out") {
    setBusyId(id);
    try {
      const res = await fetch(`/api/bookings/${id}/${action}`, { method: "POST" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success(action === "check-in" ? "Checked in" : "Checked out");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="dashboard-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <h2 className="text-base font-semibold text-gray-900">Today&apos;s schedule</h2>
        <Link href="/dashboard/bookings" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
          View all →
        </Link>
      </div>

      {bookings.length === 0 ? (
        <div className="py-12 text-center">
          <CalendarDays className="w-9 h-9 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500 font-medium">Nothing booked today</p>
          <p className="text-xs text-gray-400 mt-0.5">Enjoy the quiet — or add a booking.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {bookings.map((b) => {
            const s = STATUS[b.status] ?? DEFAULT_STATUS;
            const start = parseISO(b.startTime);
            const end = parseISO(b.endTime);
            const isBusy = busyId === b.id;
            return (
              <div key={b.id} className="flex items-center gap-2 sm:gap-4 px-3 sm:px-5 py-3 hover:bg-gray-50/60 transition-colors">
                <div className="w-10 sm:w-12 flex-shrink-0 text-right">
                  <p className="text-xs sm:text-sm font-semibold text-gray-900 leading-tight">{format(start, "HH:mm")}</p>
                  <p className="text-[10px] sm:text-xs text-gray-400">{format(end, "HH:mm")}</p>
                </div>
                <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: s.solid }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {b.resourceName}
                    {b.title && <span className="text-gray-400 font-normal hidden sm:inline"> — {b.title}</span>}
                  </p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {b.memberName ?? "Walk-in"}
                  </p>
                </div>
                <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 hidden sm:inline-flex", s.bg, s.text)}>
                  {s.label}
                </span>
                <div className="flex-shrink-0">
                  {(b.status === "CONFIRMED" || b.status === "PENDING") && (
                    <button disabled={isBusy} onClick={() => quickAction(b.id, "check-in")}
                      className="flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-50">
                      <LogIn className="w-3.5 h-3.5" /> <span className="hidden sm:inline">In</span>
                    </button>
                  )}
                  {b.status === "CHECKED_IN" && (
                    <button disabled={isBusy} onClick={() => quickAction(b.id, "check-out")}
                      className="flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-50">
                      <LogOut className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Out</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
