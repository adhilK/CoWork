"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  X,
  Loader2,
  QrCode,
  Download,
  CalendarCheck,
} from "lucide-react";
import { downloadTicket } from "@/lib/ticket-canvas";
import { formatDate, formatTime, humanizeEnum } from "@/lib/utils";
import { ResourceIcon } from "@/components/shared/resource-icon";
import type { ResourceType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

type Booking = {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  title: string | null;
  attendees: number;
  amountCharged?: number;
  creditsUsed?: number;
  checkinUrl?: string | null;
  resource: {
    id: string;
    name: string;
    type: string;
    location?: { name: string } | null;
  } | null;
};

type Props = {
  upcoming: Booking[];
  past: Booking[];
};

const STATUS_STYLES: Record<string, string> = {
  CONFIRMED: "bg-green-50 text-green-700 border-green-200/60",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200/60",
  CHECKED_IN: "bg-blue-50 text-blue-700 border-blue-200/60",
  COMPLETED: "bg-gray-50 text-gray-600 border-gray-200/60",
  CANCELLED: "bg-red-50 text-red-700 border-red-200/60",
  NO_SHOW: "bg-orange-50 text-orange-700 border-orange-200/60",
};

// ── Ticket modal ──────────────────────────────────────────────────────────────

function TicketModal({
  booking,
  open,
  onClose,
}: {
  booking: Booking;
  open: boolean;
  onClose: () => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);
  const qrUrl = booking.checkinUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=20&data=${encodeURIComponent(booking.checkinUrl)}`
    : null;

  async function handleDownload() {
    if (!booking.checkinUrl) return;
    setDownloading(true);
    try {
      await downloadTicket(
        booking.checkinUrl,
        {
          spaceName: booking.resource?.name ?? "Space",
          date: formatDate(start),
          time: `${formatTime(start)} – ${formatTime(end)}`,
          status: booking.status,
        },
        `ticket-${booking.resource?.name?.replace(/\s+/g, "-").toLowerCase() ?? booking.id}.png`
      );
    } catch {
      toast.error("Failed to download ticket");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-emerald-600" />
            Booking ticket
          </DialogTitle>
        </DialogHeader>

        {/* Booking details */}
        <div className="dashboard-card p-4 space-y-2.5 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-400">Space</span>
            <span className="font-medium text-gray-800 text-right">
              {booking.resource?.name ?? "—"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-400">Date</span>
            <span className="font-medium text-gray-800 text-right">{formatDate(start)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-400">Time</span>
            <span className="font-medium text-gray-800 text-right">
              {formatTime(start)} – {formatTime(end)}
            </span>
          </div>
          {booking.attendees > 1 && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-400">Attendees</span>
              <span className="font-medium text-gray-800">{booking.attendees}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-400">Status</span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                STATUS_STYLES[booking.status] ?? "bg-gray-50 text-gray-500 border-gray-200"
              }`}
            >
              {humanizeEnum(booking.status)}
            </span>
          </div>
        </div>

        {/* QR code */}
        {qrUrl ? (
          <div className="flex flex-col items-center gap-2 mt-1">
            <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="Check-in QR" width={160} height={160} className="w-40 h-40" src={qrUrl} />
            </div>
            <p className="text-[11px] text-gray-400">Scan at reception to check in</p>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-emerald-600 transition-colors disabled:opacity-50"
            >
              {downloading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Download className="w-3 h-3" />
              )}
              Download ticket
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <QrCode className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-xs text-gray-400">
              {booking.status === "PENDING"
                ? "QR code will be available once your booking is approved."
                : "Check-in QR not available."}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button className="w-full text-sm text-white" style={{ background: "linear-gradient(135deg,#16A34A,#15803D)" }} onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Booking row ───────────────────────────────────────────────────────────────

function BookingRow({
  booking,
  canCancel,
  onCancel,
  onViewTicket,
}: {
  booking: Booking;
  canCancel: boolean;
  onCancel: (id: string) => void;
  onViewTicket: (b: Booking) => void;
}) {
  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);

  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl border border-gray-100 bg-white hover:border-gray-200 transition-colors">
      <ResourceIcon type={(booking.resource?.type ?? "OTHER") as ResourceType} size="lg" className="mt-0.5 flex-shrink-0" />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">
              {booking.title ?? booking.resource?.name ?? "Booking"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {booking.resource?.name}
              {booking.resource?.location?.name && (
                <> · {booking.resource.location.name}</>
              )}
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

        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(start)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTime(start)} – {formatTime(end)}
          </span>
          {booking.attendees > 1 && <span>{booking.attendees} people</span>}
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2.5 text-xs text-gray-400 hover:text-gray-700 hover:bg-gray-50"
          onClick={() => onViewTicket(booking)}
          title="View ticket & QR"
        >
          <QrCode className="w-3.5 h-3.5" />
        </Button>
        {canCancel && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={() => onCancel(booking.id)}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export function MyBookingsView({ upcoming, past }: Props) {
  const [bookings, setBookings] = useState({ upcoming, past });
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [ticketBooking, setTicketBooking] = useState<Booking | null>(null);

  async function confirmCancel() {
    if (!cancelId) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/bookings/${cancelId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Failed to cancel booking");
        return;
      }
      toast.success("Booking cancelled");
      setBookings((prev) => ({
        upcoming: prev.upcoming.filter((b) => b.id !== cancelId),
        past: prev.past,
      }));
      setCancelId(null);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <div>
        <h1 className="page-title">My bookings</h1>
        <p className="page-subtitle">View and manage your upcoming and past reservations.</p>
      </div>

      {/* Upcoming */}
      <div className="dashboard-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">
            Upcoming
            {bookings.upcoming.length > 0 && (
              <span className="ml-2 text-xs text-gray-400 font-normal">
                ({bookings.upcoming.length})
              </span>
            )}
          </h2>
          <Link href="/portal/book">
            <Button
              size="sm"
              className="text-white text-xs h-8"
              style={{ background: "linear-gradient(135deg, #16A34A, #15803D)" }}
            >
              <Calendar className="w-3.5 h-3.5 mr-1.5" />
              New booking
            </Button>
          </Link>
        </div>

        {bookings.upcoming.length === 0 ? (
          <div className="text-center py-10">
            <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No upcoming bookings</p>
            <Link href="/portal/book">
              <Button variant="outline" size="sm" className="mt-3 text-xs">
                Book a space
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {bookings.upcoming.map((b) => (
              <BookingRow
                key={b.id}
                booking={b}
                canCancel={b.status === "CONFIRMED" || b.status === "PENDING"}
                onCancel={setCancelId}
                onViewTicket={setTicketBooking}
              />
            ))}
          </div>
        )}
      </div>

      {/* Past */}
      {bookings.past.length > 0 && (
        <div className="dashboard-card p-5">
          <h2 className="section-title mb-4">
            Past bookings
            <span className="ml-2 text-xs text-gray-400 font-normal">
              ({bookings.past.length})
            </span>
          </h2>
          <div className="space-y-2">
            {bookings.past.map((b) => (
              <BookingRow
                key={b.id}
                booking={b}
                canCancel={false}
                onCancel={setCancelId}
                onViewTicket={setTicketBooking}
              />
            ))}
          </div>
        </div>
      )}

      {/* Ticket modal */}
      {ticketBooking && (
        <TicketModal
          booking={ticketBooking}
          open={!!ticketBooking}
          onClose={() => setTicketBooking(null)}
        />
      )}

      {/* Cancel dialog */}
      <Dialog open={!!cancelId} onOpenChange={(open) => !open && setCancelId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancel booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this booking? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelId(null)}
              disabled={cancelling}
              className="text-sm"
            >
              Keep it
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCancel}
              disabled={cancelling}
              className="text-sm"
            >
              {cancelling ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Yes, cancel"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
