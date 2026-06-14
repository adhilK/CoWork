"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import { Plus, CalendarDays, List, LogIn, LogOut, Users, ChevronRight, Loader2, CalendarCheck, Clock, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { toast } from "sonner";
import { BookingDialog } from "@/components/bookings/booking-dialog";
import { cn } from "@/lib/utils";
import { ResourceIcon } from "@/components/shared/resource-icon";
import { format, isToday, isTomorrow, isThisWeek, parseISO } from "date-fns";
import type { ResourceType } from "@prisma/client";

type Resource = { id: string; name: string; type: ResourceType; capacity: number; hourlyRate: any };
type Member = { id: string; userId: string; user: { name: string | null; email: string } };

type ScheduleBooking = {
  id: string; title: string | null; startTime: string; endTime: string;
  status: string; attendees: number; amountCharged: number;
  resourceId: string; resourceName: string; resourceType: ResourceType;
  memberName: string | null;
};

type Props = {
  resources: Resource[];
  members: Member[];
  currency: string;
  timezone: string;
  upcomingBookings: ScheduleBooking[];
};

// ── ONE intuitive colour scheme: by booking status ──────────────────────────
const STATUS: Record<string, { label: string; text: string; bg: string; solid: string }> = {
  PENDING:    { label: "Pending",    text: "text-amber-700",   bg: "bg-amber-50",   solid: "#F59E0B" },
  CONFIRMED:  { label: "Confirmed",  text: "text-indigo-700",  bg: "bg-indigo-50",  solid: "#6366F1" },
  CHECKED_IN: { label: "Checked in", text: "text-emerald-700", bg: "bg-emerald-50", solid: "#16A34A" },
  COMPLETED:  { label: "Completed",  text: "text-gray-500",    bg: "bg-gray-100",   solid: "#9CA3AF" },
  CANCELLED:  { label: "Cancelled",  text: "text-red-600",     bg: "bg-red-50",     solid: "#EF4444" },
  NO_SHOW:    { label: "No show",    text: "text-orange-600",  bg: "bg-orange-50",  solid: "#F97316" },
};
const DEFAULT_STATUS = STATUS.CONFIRMED!;

function dayLabel(d: Date) {
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  if (isThisWeek(d, { weekStartsOn: 1 })) return format(d, "EEEE");
  return format(d, "EEE d MMM");
}

function StatusPill({ status }: { status: string }) {
  const s = STATUS[status] ?? DEFAULT_STATUS;
  return <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", s.bg, s.text)}>{s.label}</span>;
}

export function BookingsView({ resources, members, currency, timezone, upcomingBookings }: Props) {
  const router = useRouter();
  const calendarRef = useRef<FullCalendar>(null);
  const [tab, setTab] = useState<"schedule" | "calendar">("schedule");
  const [resourceFilter, setResourceFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [calLoading, setCalLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  // In-memory cache of fetched calendar windows: key = `${start}|${end}|${filter}`
  const eventCache = useRef<Map<string, any[]>>(new Map());

  // Track viewport so the calendar can use a phone-friendly view on small screens
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Filter + group the schedule by day
  const grouped = useMemo(() => {
    const filtered = resourceFilter === "all"
      ? upcomingBookings
      : upcomingBookings.filter((b) => b.resourceId === resourceFilter);
    const groups: { key: string; label: string; date: Date; items: ScheduleBooking[] }[] = [];
    const map = new Map<string, typeof groups[0]>();
    for (const b of filtered) {
      const d = parseISO(b.startTime);
      const key = format(d, "yyyy-MM-dd");
      if (!map.has(key)) {
        const g = { key, label: dayLabel(d), date: d, items: [] as ScheduleBooking[] };
        map.set(key, g);
        groups.push(g);
      }
      map.get(key)!.items.push(b);
    }
    return groups;
  }, [upcomingBookings, resourceFilter]);

  const todayCount = upcomingBookings.filter((b) => isToday(parseISO(b.startTime))).length;
  const pendingCount = upcomingBookings.filter((b) => b.status === "PENDING").length;
  const checkedInNow = upcomingBookings.filter((b) => b.status === "CHECKED_IN").length;
  const weekCount = upcomingBookings.filter((b) => isThisWeek(parseISO(b.startTime), { weekStartsOn: 1 })).length;

  const openNew = () => { setSelectedBookingId(null); setSelectedDate(new Date()); setDialogOpen(true); };
  const openEdit = (id: string) => { setSelectedBookingId(id); setSelectedDate(null); setDialogOpen(true); };

  async function quickAction(id: string, action: "check-in" | "check-out", e: React.MouseEvent) {
    e.stopPropagation();
    setBusyId(id);
    try {
      const res = await fetch(`/api/bookings/${id}/${action}`, { method: "POST" });
      if (!res.ok) { const er = await res.json(); throw new Error(er.error); }
      toast.success(action === "check-in" ? "Checked in" : "Checked out");
      router.refresh();
      eventCache.current.clear();
      calendarRef.current?.getApi().refetchEvents();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  // Local id → name maps (props already loaded) so the API can skip joins
  const resourceNames = useMemo(() => Object.fromEntries(resources.map((r) => [r.id, r.name])), [resources]);
  const memberNames = useMemo(
    () => Object.fromEntries(members.map((m) => [m.id, m.user.name ?? m.user.email])),
    [members]
  );

  // ── Calendar: lazy-fetch events, coloured by STATUS only, with caching ────
  const mapEvents = (rows: any[]) =>
    rows.map((b: any) => {
      const s = STATUS[b.status] ?? DEFAULT_STATUS;
      const resourceName = resourceNames[b.resourceId] ?? "";
      const memberName = b.memberId ? (memberNames[b.memberId] ?? "") : "";
      return {
        id: b.id,
        title: `${resourceName}${memberName ? " · " + memberName : ""}`,
        start: b.startTime, end: b.endTime,
        backgroundColor: s.solid, borderColor: s.solid, textColor: "#fff",
      };
    });

  const fetchEvents = useCallback(
    async (info: { startStr: string; endStr: string }, cb: (events: any[]) => void) => {
      const cacheKey = `${info.startStr}|${info.endStr}|${resourceFilter}`;
      const cached = eventCache.current.get(cacheKey);
      if (cached) { cb(cached); return; }      // instant on revisits
      setCalLoading(true);
      try {
        const params = new URLSearchParams({
          start: info.startStr, end: info.endStr,
          ...(resourceFilter !== "all" && { resourceId: resourceFilter }),
        });
        const res = await fetch(`/api/bookings?${params}`);
        const data = await res.json();
        const events = mapEvents(data.data ?? []);
        eventCache.current.set(cacheKey, events);
        cb(events);
      } catch {
        toast.error("Failed to load bookings");
        cb([]);
      } finally {
        setCalLoading(false);
      }
    },
    [resourceFilter]
  );

  // Any mutation invalidates the cache so the calendar shows fresh data
  const invalidateCalendar = () => {
    eventCache.current.clear();
    calendarRef.current?.getApi().refetchEvents();
  };

  const onDialogSuccess = () => {
    setDialogOpen(false);
    router.refresh();
    invalidateCalendar();
    toast.success("Booking saved");
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Bookings</h1>
          <p className="page-subtitle">Manage reservations and check-ins</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Schedule / Calendar toggle */}
          <div className="flex rounded-xl border border-gray-200 bg-white overflow-hidden p-0.5">
            {([["schedule", "Schedule", List], ["calendar", "Calendar", CalendarDays]] as const).map(
              ([key, label, Icon]) => (
                <button key={key} onClick={() => setTab(key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                    tab === key ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-700"
                  )}>
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              )
            )}
          </div>
          <Button onClick={openNew} className="h-9 font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
            <Plus className="w-4 h-4 mr-1.5" /> New booking
          </Button>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Today", value: todayCount, icon: CalendarCheck, tint: "#16A34A", bg: "#DCFCE7" },
          { label: "This week", value: weekCount, icon: CalendarDays, tint: "#6366F1", bg: "#EEF2FF" },
          { label: "Pending approval", value: pendingCount, icon: Clock, tint: "#F59E0B", bg: "#FEF3C7" },
          { label: "Checked in now", value: checkedInNow, icon: UserCheck, tint: "#0EA5E9", bg: "#E0F2FE" },
        ].map((s) => (
          <div key={s.label} className="dashboard-card p-4 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.bg }}>
              <s.icon style={{ color: s.tint, width: 18, height: 18 }} />
            </span>
            <div>
              <p className="text-2xl font-bold text-gray-900 leading-none">{s.value}</p>
              <p className="text-xs text-gray-400 mt-1">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Resource filter — single simple dropdown */}
      {resources.length > 0 && (
        <Select value={resourceFilter} onValueChange={(v) => { setResourceFilter(v ?? "all"); calendarRef.current?.getApi().refetchEvents(); }} /* cache keyed by filter */>
          <SelectTrigger className="h-9 w-56 bg-white">
            <span className={resourceFilter === "all" ? "text-gray-500" : ""}>
              {resourceFilter === "all" ? "All resources" : resources.find((r) => r.id === resourceFilter)?.name ?? "All resources"}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All resources</SelectItem>
            {resources.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                <span className="inline-flex items-center gap-2"><ResourceIcon type={r.type} size="sm" /> {r.name}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* ── SCHEDULE VIEW (default) ─────────────────────────────────────────── */}
      {tab === "schedule" && (
        grouped.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No upcoming bookings"
            description="Bookings are reservations of your spaces — desks, meeting rooms, or offices. Create one for a member, or members can book themselves from their portal."
            steps={[
              "Pick a resource, member, date, and time.",
              "Charge a fee or deduct booking credits automatically.",
              "It shows here and on the member's portal.",
            ]}
            primary={{ label: "Create a booking", onClick: openNew }}
          />
        ) : (
          <div className="space-y-6">
            {grouped.map((g) => (
              <div key={g.key}>
                <div className="flex items-center gap-2 mb-2.5">
                  <h3 className="text-sm font-bold text-gray-900">{g.label}</h3>
                  <span className="text-xs text-gray-400">{format(g.date, "d MMM")}</span>
                  <span className="text-xs text-gray-300">· {g.items.length} booking{g.items.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="dashboard-card divide-y divide-gray-50 overflow-hidden">
                  {g.items.map((b) => {
                    const start = parseISO(b.startTime);
                    const end = parseISO(b.endTime);
                    const isBusy = busyId === b.id;
                    return (
                      <div key={b.id} onClick={() => openEdit(b.id)}
                        className="flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 hover:bg-gray-50/70 cursor-pointer transition-colors group">
                        {/* Time */}
                        <div className="w-11 sm:w-16 flex-shrink-0 text-right">
                          <p className="text-sm font-semibold text-gray-900 leading-tight">{format(start, "HH:mm")}</p>
                          <p className="text-xs text-gray-400">{format(end, "HH:mm")}</p>
                        </div>
                        {/* Status accent bar */}
                        <div className="w-1 self-stretch rounded-full flex-shrink-0"
                          style={{ background: (STATUS[b.status] ?? DEFAULT_STATUS).solid }} />
                        {/* Resource icon */}
                        <ResourceIcon type={b.resourceType} size="sm" />
                        {/* Resource + member */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {b.resourceName}
                            {b.title && <span className="text-gray-400 font-normal"> — {b.title}</span>}
                          </p>
                          <p className="text-xs text-gray-400 truncate flex items-center gap-2 mt-0.5">
                            {b.memberName ?? "Walk-in"}
                            {b.attendees > 1 && <span className="flex items-center gap-0.5"><Users className="w-3 h-3" />{b.attendees}</span>}
                          </p>
                        </div>
                        {/* Status pill — hidden on small screens (accent bar shows status) */}
                        <div className="hidden sm:block flex-shrink-0">
                          <StatusPill status={b.status} />
                        </div>
                        {/* Quick action */}
                        <div className="flex-shrink-0 flex justify-end sm:w-24">
                          {(b.status === "CONFIRMED" || b.status === "PENDING") && (
                            <button disabled={isBusy} onClick={(e) => quickAction(b.id, "check-in", e)}
                              className="flex items-center gap-1 text-xs font-medium p-2 sm:px-2.5 sm:py-1.5 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-50">
                              <LogIn className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Check in</span>
                            </button>
                          )}
                          {b.status === "CHECKED_IN" && (
                            <button disabled={isBusy} onClick={(e) => quickAction(b.id, "check-out", e)}
                              className="flex items-center gap-1 text-xs font-medium p-2 sm:px-2.5 sm:py-1.5 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-50">
                              <LogOut className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Check out</span>
                            </button>
                          )}
                          {b.status !== "CONFIRMED" && b.status !== "PENDING" && b.status !== "CHECKED_IN" && (
                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── CALENDAR VIEW (secondary) ───────────────────────────────────────── */}
      {tab === "calendar" && (
        <div className="dashboard-card p-2 sm:p-4 overflow-hidden relative">
          {calLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading bookings…
              </div>
            </div>
          )}
          <style>{`
            .fc-toolbar { flex-wrap: wrap; gap: 8px; }
            .fc-toolbar-title { font-size: 1rem !important; font-weight: 600 !important; }
            .fc-button { border-radius: 8px !important; font-size: 13px !important; text-transform: capitalize !important; }
            .fc-button-primary { background: #15803D !important; border-color: #15803D !important; }
            .fc-button-primary:not(.fc-button-active):hover { background: #166534 !important; }
            .fc-event { border-radius: 6px !important; font-size: 11px !important; cursor: pointer; padding: 1px 3px; }
            .fc-event-title { font-weight: 500 !important; }
            .fc-timegrid-slot { height: 38px !important; }
            .fc-col-header-cell { font-size: 12px !important; font-weight: 600; }
            @media (max-width: 640px) {
              .fc .fc-toolbar.fc-header-toolbar { flex-direction: column; align-items: stretch; gap: 6px; margin-bottom: 10px; }
              .fc-toolbar-chunk { display: flex; justify-content: center; }
              .fc-toolbar-title { font-size: 0.9rem !important; }
              .fc .fc-button { padding: 4px 8px !important; font-size: 12px !important; }
              .fc-list-event-title { font-size: 13px; }
            }
          `}</style>
          <FullCalendar
            key={isMobile ? "m" : "d"}
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView={isMobile ? "listWeek" : "timeGridWeek"}
            headerToolbar={isMobile
              ? { left: "prev,next", center: "title", right: "listWeek,timeGridDay" }
              : { left: "prev,next today", center: "title", right: "timeGridDay,timeGridWeek,dayGridMonth" }}
            buttonText={{ today: "Today", day: "Day", week: "Week", month: "Month", list: "List" }}
            events={fetchEvents}
            selectable selectMirror editable={false} nowIndicator
            slotMinTime="07:00:00" slotMaxTime="22:00:00" height="auto"
            timeZone="local"
            allDaySlot={false}
            noEventsContent="No bookings in this range"
            eventClick={({ event }) => openEdit(event.id)}
            select={({ start }) => { setSelectedDate(start); setSelectedBookingId(null); setDialogOpen(true); }}
          />
          {/* Minimal inline legend */}
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50 text-xs text-gray-400 flex-wrap">
            {Object.entries(STATUS).filter(([k]) => k !== "NO_SHOW").map(([k, s]) => (
              <span key={k} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.solid }} /> {s.label}
              </span>
            ))}
          </div>
        </div>
      )}

      <BookingDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        bookingId={selectedBookingId}
        defaultDate={selectedDate}
        resources={resources}
        members={members}
        currency={currency}
        onSuccess={onDialogSuccess}
      />
    </div>
  );
}
