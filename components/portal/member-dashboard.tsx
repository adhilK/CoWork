import Link from "next/link";
import { Calendar, Clock, CreditCard, ArrowRight, Pin, Megaphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    <div className="flex items-start gap-3 p-3.5 rounded-xl border border-gray-100 bg-white hover:border-gray-200 transition-colors">
      <span className="text-xl leading-none mt-0.5">
        {RESOURCE_EMOJI[booking.resource?.type ?? "OTHER"] ?? "📌"}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 text-sm truncate">
          {booking.title ?? booking.resource?.name ?? "Booking"}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {formatTime(booking.startTime)} – {formatTime(booking.endTime)}
          {" · "}
          {booking.resource?.name}
        </p>
      </div>
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
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
}: Props) {
  const nextBooking = upcomingBookings[0];

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {getGreeting()}, {memberName?.split(" ")[0] ?? "there"} 👋
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {formatDate(new Date())} — here's your workspace overview.
          </p>
        </div>
        <Link href="/portal/book">
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm hidden sm:inline-flex">
            <Calendar className="w-4 h-4 mr-2" />
            Book a space
          </Button>
        </Link>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="dashboard-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-4.5 h-4.5 text-emerald-600" style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 leading-none">{credits}</p>
              <p className="text-xs text-gray-400 mt-0.5">Credits remaining</p>
            </div>
          </div>
        </div>

        <div className="dashboard-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4.5 h-4.5 text-blue-600" style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 leading-none">{bookingsThisMonth}</p>
              <p className="text-xs text-gray-400 mt-0.5">Bookings this month</p>
            </div>
          </div>
        </div>

        <div className="dashboard-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4.5 h-4.5 text-violet-600" style={{ width: 18, height: 18 }} />
            </div>
            <div className="min-w-0">
              {nextBooking ? (
                <>
                  <p className="text-sm font-bold text-gray-900 truncate leading-tight">
                    {nextBooking.resource?.name ?? "Upcoming"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(nextBooking.startTime)} at {formatTime(nextBooking.startTime)}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-400">No upcoming</p>
                  <p className="text-xs text-gray-400 mt-0.5">No bookings scheduled</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Today's bookings */}
      <div className="dashboard-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 text-sm">Today's bookings</h2>
          <span className="text-xs text-gray-400">{formatDate(new Date())}</span>
        </div>
        {todayBookings.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No bookings today</p>
            <Link href="/portal/book">
              <Button variant="outline" size="sm" className="mt-3 text-xs">
                Book a space
              </Button>
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
            <h2 className="font-semibold text-gray-900 text-sm">Upcoming bookings</h2>
            <Link
              href="/portal/my-bookings"
              className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {upcomingBookings.slice(0, 3).map((b) => (
              <div key={b.id} className="flex items-start gap-3 p-3.5 rounded-xl border border-gray-100 bg-white">
                <span className="text-xl leading-none mt-0.5">
                  {RESOURCE_EMOJI[b.resource?.type ?? "OTHER"] ?? "📌"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">
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
            <h2 className="font-semibold text-gray-900 text-sm">Announcements</h2>
          </div>
          <div className="space-y-3">
            {announcements.map((ann) => (
              <div key={ann.id} className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 text-sm">{ann.title}</p>
                      {ann.isPinned && (
                        <Pin className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-3">{ann.body}</p>
                    <p className="text-[11px] text-gray-300 mt-1.5">{formatDate(ann.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
