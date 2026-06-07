import Link from "next/link";
import { Calendar, Clock, CreditCard, ArrowRight, Pin, Megaphone, CalendarPlus, Sparkles } from "lucide-react";
import { formatDate, formatDateTime, formatTime, humanizeEnum } from "@/lib/utils";

type Booking = {
  id: string;
  startTime: Date;
  endTime: Date;
  status: string;
  title: string | null;
  resource: { name: string; type: string } | null;
};

type Announcement = {
  id: string;
  title: string;
  body: string;
  isPinned: boolean;
  createdAt: Date;
};

type Props = {
  memberName: string | null;
  credits: number;
  todayBookings: Booking[];
  upcomingBookings: Booking[];
  announcements: Announcement[];
  bookingsThisMonth: number;
  isNewMember?: boolean;
};

const STATUS_STYLES: Record<string, string> = {
  CONFIRMED: "bg-green-50 text-green-700 border-green-200/60",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200/60",
  CHECKED_IN: "bg-blue-50 text-blue-700 border-blue-200/60",
  COMPLETED: "bg-gray-50 text-gray-600 border-gray-200/60",
  CANCELLED: "bg-red-50 text-red-700 border-red-200/60",
  NO_SHOW: "bg-orange-50 text-orange-700 border-orange-200/60",
};

const RESOURCE_EMOJI: Record<string, string> = {
  HOT_DESK: "🪑",
  DEDICATED_DESK: "🖥️",
  PRIVATE_OFFICE: "🚪",
  MEETING_ROOM: "📅",
  EVENT_SPACE: "🏛️",
  PHONE_BOOTH: "📞",
  PODCAST_ROOM: "🎙️",
  OTHER: "📌",
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function BookingCard({ booking }: { booking: Booking }) {
  return (
    <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-gray-100 bg-white hover:border-gray-200 transition-colors">
      <span className="text-xl leading-none flex-shrink-0">
        {RESOURCE_EMOJI[booking.resource?.type ?? "OTHER"] ?? "📌"}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm truncate">
          {booking.title ?? booking.resource?.name ?? "Booking"}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {formatTime(booking.startTime)} – {formatTime(booking.endTime)}
          {" · "}
          {booking.resource?.name}
        </p>
      </div>
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border flex-shrink-0 ${
          STATUS_STYLES[booking.status] ?? "bg-gray-50 text-gray-500 border-gray-200"
        }`}
      >
        {humanizeEnum(booking.status)}
      </span>
    </div>
  );
}

export function MemberDashboard({
  memberName,
  credits,
  todayBookings,
  upcomingBookings,
  announcements,
  bookingsThisMonth,
  isNewMember,
}: Props) {
  const nextBooking = upcomingBookings[0];

  return (
    <div className="space-y-5 animate-fade-in max-w-4xl">
      {/* Welcome banner for first-time invited members */}
      {isNewMember && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5">
          <span className="text-xl leading-none">🎉</span>
          <div className="flex-1">
            <p className="font-semibold text-emerald-900 text-sm">Welcome to your member portal!</p>
            <p className="text-sm text-emerald-700 mt-0.5">
              You&apos;re all set. Use the{" "}
              <Link href="/portal/book" className="underline underline-offset-2 font-medium">
                Book a space
              </Link>{" "}
              button to make your first reservation.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="page-title">
            {getGreeting()}, {memberName?.split(" ")[0] ?? "there"} 👋
          </h1>
          <p className="page-subtitle">{formatDate(new Date())}</p>
        </div>
        <Link
          href="/portal/book"
          className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold text-white flex-shrink-0 transition-transform hover:-translate-y-0.5"
          style={{ background: "linear-gradient(135deg, #16A34A, #15803D)", boxShadow: "0 10px 24px -10px rgba(21,128,61,0.5)" }}
        >
          <CalendarPlus className="w-4 h-4" />
          Book a space
        </Link>
      </div>

      {/* KPI row — matches dashboard card system */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Credits — hero accent card */}
        <div className="kpi-card kpi-card-accent rounded-2xl p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] sm:text-xs font-medium mb-1.5 sm:mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
                Credits left
              </p>
              <p className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-none">{credits}</p>
            </div>
            <div className="hidden sm:flex w-9 h-9 rounded-xl items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.15)" }}>
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {/* Bookings this month */}
        <div className="kpi-card rounded-2xl p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] sm:text-xs font-medium text-gray-400 mb-1.5 sm:mb-2">This month</p>
              <p className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 leading-none">{bookingsThisMonth}</p>
              <p className="text-[11px] text-gray-400 mt-1.5 sm:mt-2 font-medium">bookings made</p>
            </div>
            <div className="hidden sm:flex w-9 h-9 rounded-xl bg-blue-50 items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Next booking */}
        <div className="kpi-card rounded-2xl p-4 sm:p-5 col-span-2 lg:col-span-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] sm:text-xs font-medium text-gray-400 mb-1.5 sm:mb-2">Next booking</p>
              {nextBooking ? (
                <>
                  <p className="text-sm sm:text-base font-bold text-gray-900 truncate leading-tight">
                    {nextBooking.resource?.name ?? "Upcoming"}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1 font-medium">
                    {formatDate(nextBooking.startTime)} · {formatTime(nextBooking.startTime)}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm sm:text-base font-bold text-gray-300 leading-tight">Nothing scheduled</p>
                  <Link href="/portal/book" className="text-[11px] text-emerald-600 hover:text-emerald-700 mt-1 inline-flex items-center gap-1 font-medium">
                    Book one <ArrowRight className="w-3 h-3" />
                  </Link>
                </>
              )}
            </div>
            <div className="hidden sm:flex w-9 h-9 rounded-xl bg-violet-50 items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-violet-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Today's bookings */}
      <div className="dashboard-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Today&apos;s bookings</h2>
          <span className="text-xs text-gray-400">{formatDate(new Date())}</span>
        </div>
        {todayBookings.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-5 h-5 text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">Nothing booked for today</p>
            <Link
              href="/portal/book"
              className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-transform hover:-translate-y-0.5"
              style={{ background: "linear-gradient(135deg, #16A34A, #15803D)" }}
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              Book a space
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {todayBookings.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </div>
        )}
      </div>

      {/* Upcoming bookings */}
      {upcomingBookings.length > 0 && (
        <div className="dashboard-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Upcoming</h2>
            <Link
              href="/portal/my-bookings"
              className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-medium"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {upcomingBookings.slice(0, 3).map((b) => (
              <div key={b.id} className="flex items-center gap-3 p-3.5 rounded-2xl border border-gray-100 bg-white">
                <span className="text-xl leading-none flex-shrink-0">
                  {RESOURCE_EMOJI[b.resource?.type ?? "OTHER"] ?? "📌"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">
                    {b.title ?? b.resource?.name ?? "Booking"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDateTime(b.startTime)} – {formatTime(b.endTime)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="dashboard-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Megaphone className="w-4 h-4 text-gray-400" />
            <h2 className="section-title">Announcements</h2>
          </div>
          <div className="space-y-3">
            {announcements.map((ann) => (
              <div key={ann.id} className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 text-sm">{ann.title}</p>
                  {ann.isPinned && <Pin className="w-3 h-3 text-emerald-500 flex-shrink-0" />}
                </div>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-3">{ann.body}</p>
                <p className="text-[11px] text-gray-300 mt-1.5">{formatDate(ann.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
