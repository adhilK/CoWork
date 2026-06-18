"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Calendar,
  Users,
  Search,
  Clock,
  MapPin,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Check,
  ImageIcon,
  Zap,
  ShieldCheck,
  Sparkles,
  Wallet,
  CalendarCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate, formatTime, humanizeEnum } from "@/lib/utils";
import { ResourceIcon, RESOURCE_ICON } from "@/components/shared/resource-icon";
import type { ResourceType } from "@prisma/client";

type Resource = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  capacity: number;
  hourlyRate: number | null;
  halfDayRate: number | null;
  fullDayRate: number | null;
  monthlyRate: number | null;
  amenities: string[];
  images: string[];
  requiresApproval: boolean;
  isActive: boolean;
  location: { name: string } | null;
};

type BookingFormState = {
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  attendees: number;
};

type Confirmation = {
  resourceName: string;
  resourceType: string;
  date: Date;
  start: Date;
  end: Date;
  status: string;
  checkinUrl: string | null;
};

const RESOURCE_TYPE_ORDER = [
  "MEETING_ROOM",
  "PRIVATE_OFFICE",
  "HOT_DESK",
  "DEDICATED_DESK",
  "EVENT_SPACE",
  "PHONE_BOOTH",
  "PODCAST_ROOM",
  "OTHER",
];

function todayString() {
  return new Date().toISOString().split("T")[0]!;
}

/**
 * Client-side mirror of lib/booking-pricing.ts so the member sees the exact
 * price/credit outcome before confirming. The server remains the source of
 * truth — this only previews it.
 */
function previewCharge(
  resource: Resource,
  start: Date,
  end: Date,
  memberCredits: number
) {
  const durationHours = (end.getTime() - start.getTime()) / 3600000;
  let amount = 0;
  if (resource.hourlyRate) {
    amount = durationHours * resource.hourlyRate;
  } else if (resource.fullDayRate && durationHours >= 7) {
    amount = resource.fullDayRate;
  } else if (resource.halfDayRate && durationHours >= 3.5) {
    amount = resource.halfDayRate;
  }
  amount = Math.round(amount * 100) / 100;
  const creditsNeeded = Math.ceil(durationHours);
  const canUseCredits = amount > 0 && creditsNeeded > 0 && memberCredits >= creditsNeeded;
  return { durationHours, amount, creditsNeeded, canUseCredits };
}

function formatDuration(hours: number) {
  if (!isFinite(hours) || hours <= 0) return "—";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return [h > 0 ? `${h}h` : null, m > 0 ? `${m}m` : null].filter(Boolean).join(" ") || "0m";
}

export function ResourceBrowser({
  currency,
  credits,
  initialResources,
}: {
  currency: string;
  credits: number;
  initialResources?: Resource[];
}) {
  const router = useRouter();
  const [resources, setResources] = useState<Resource[]>(initialResources ?? []);
  // When the page already provided resources, there's nothing to load.
  const [loading, setLoading] = useState(!initialResources);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  // Details view (with image gallery) — opened by clicking a card.
  const [detailResource, setDetailResource] = useState<Resource | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [form, setForm] = useState<BookingFormState>({
    date: todayString(),
    startTime: "09:00",
    endTime: "10:00",
    title: "",
    attendees: 1,
  });
  const [submitting, setSubmitting] = useState(false);
  // Post-booking confirmation screen (with QR check-in).
  const [confirmed, setConfirmed] = useState<Confirmation | null>(null);

  useEffect(() => {
    // Resources are supplied by the server component; only fall back to the
    // API if they weren't (keeps the component usable standalone).
    if (initialResources) return;
    fetch("/api/resources")
      .then((r) => r.json())
      .then((data) => {
        const list: Resource[] = Array.isArray(data) ? data : [];
        setResources(
          list.map((r) => ({
            ...r,
            hourlyRate: r.hourlyRate ? Number(r.hourlyRate) : null,
            halfDayRate: r.halfDayRate ? Number(r.halfDayRate) : null,
            fullDayRate: r.fullDayRate ? Number(r.fullDayRate) : null,
            monthlyRate: r.monthlyRate ? Number(r.monthlyRate) : null,
          }))
        );
      })
      .catch(() => toast.error("Failed to load resources"))
      .finally(() => setLoading(false));
  }, [initialResources]);

  const filtered = resources
    .filter((r) => r.isActive)
    .filter((r) => typeFilter === "ALL" || r.type === typeFilter)
    .filter(
      (r) =>
        !search ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.location?.name.toLowerCase().includes(search.toLowerCase())
    );

  const types = Array.from(new Set(resources.map((r) => r.type))).sort(
    (a, b) => RESOURCE_TYPE_ORDER.indexOf(a) - RESOURCE_TYPE_ORDER.indexOf(b)
  );

  function openDetail(resource: Resource) {
    setGalleryIndex(0);
    setDetailResource(resource);
  }

  // Move from the details view straight into the booking form.
  function bookFromDetail(resource: Resource) {
    setDetailResource(null);
    setSelectedResource(resource);
  }

  function galleryStep(dir: 1 | -1, total: number) {
    setGalleryIndex((i) => (i + dir + total) % total);
  }

  // Live preview for the open booking dialog.
  const preview = (() => {
    if (!selectedResource || !form.date || !form.startTime || !form.endTime) return null;
    const start = new Date(`${form.date}T${form.startTime}:00`);
    const end = new Date(`${form.date}T${form.endTime}:00`);
    if (!(end > start)) return null;
    return previewCharge(selectedResource, start, end, credits);
  })();

  async function handleSubmit() {
    if (!selectedResource) return;
    const { date, startTime, endTime, title, attendees } = form;
    if (!date || !startTime || !endTime) {
      toast.error("Please fill in the date and times");
      return;
    }
    const start = new Date(`${date}T${startTime}:00`);
    const end = new Date(`${date}T${endTime}:00`);
    if (end <= start) {
      toast.error("End time must be after start time");
      return;
    }
    if (end.getTime() - start.getTime() < 30 * 60 * 1000) {
      toast.error("Minimum booking duration is 30 minutes");
      return;
    }
    if (attendees > selectedResource.capacity) {
      toast.error(`This space holds up to ${selectedResource.capacity} people`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/portal/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceId: selectedResource.id,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          title: title.trim() || null,
          attendees,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to create booking");
        return;
      }
      const booking = data.data ?? data;
      // Swap the form dialog for the confirmation screen (with QR).
      setSelectedResource(null);
      setConfirmed({
        resourceName: selectedResource.name,
        resourceType: selectedResource.type,
        date: start,
        start,
        end,
        status: booking.status ?? (selectedResource.requiresApproval ? "PENDING" : "CONFIRMED"),
        checkinUrl: booking.checkinUrl ?? null,
      });
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-6xl">
      <div>
        <h1 className="page-title">Book a space</h1>
        <p className="page-subtitle">Browse available desks, rooms, and offices.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
          <Input
            placeholder="Search spaces..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm border-gray-200"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setTypeFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              typeFilter === "ALL"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
            }`}
          >
            All
          </button>
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                typeFilter === t
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {humanizeEnum(t)}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="dashboard-card p-5 space-y-3">
              <div className="skeleton h-5 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
              <div className="skeleton h-8 w-full mt-4" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 dashboard-card">
          <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 font-medium text-sm">No spaces found</p>
          <p className="text-gray-400 text-xs mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((resource) => (
            <div
              key={resource.id}
              onClick={() => openDetail(resource)}
              className="dashboard-card overflow-hidden flex flex-col hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer"
            >
              {/* Image banner — falls back to a tinted type icon when no photo */}
              {resource.images && resource.images.length > 0 ? (
                <div className="relative h-44 w-full bg-gray-100 flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={resource.images[0]} alt={resource.name} className="h-full w-full object-cover" />
                  {resource.images.length > 1 && (
                    <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                      <ImageIcon className="w-3 h-3" /> {resource.images.length}
                    </span>
                  )}
                  {/* Availability indicator */}
                  <span
                    className={`absolute top-2 left-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm ${
                      resource.requiresApproval
                        ? "bg-amber-500/90 text-white"
                        : "bg-emerald-500/90 text-white"
                    }`}
                  >
                    {resource.requiresApproval ? (
                      <><ShieldCheck className="w-3 h-3" /> Approval</>
                    ) : (
                      <><Zap className="w-3 h-3" /> Instant</>
                    )}
                  </span>
                </div>
              ) : (
                <div
                  className="relative h-44 w-full flex flex-col items-center justify-center gap-1.5 flex-shrink-0"
                  style={{ background: (RESOURCE_ICON[resource.type as ResourceType] ?? RESOURCE_ICON.OTHER).bg }}
                >
                  <ResourceIcon type={resource.type as ResourceType} size="lg" className="!bg-white/70" />
                  <span className="text-[10px] font-medium" style={{ color: (RESOURCE_ICON[resource.type as ResourceType] ?? RESOURCE_ICON.OTHER).tint }}>
                    No photos yet
                  </span>
                  <span
                    className={`absolute top-2 left-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      resource.requiresApproval
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {resource.requiresApproval ? (
                      <><ShieldCheck className="w-3 h-3" /> Approval</>
                    ) : (
                      <><Zap className="w-3 h-3" /> Instant</>
                    )}
                  </span>
                </div>
              )}

              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                      {resource.name}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {humanizeEnum(resource.type)}
                    </p>
                  </div>
                </div>

                {resource.description && (
                  <p className="text-xs text-gray-400 mb-3 line-clamp-2 leading-relaxed">
                    {resource.description}
                  </p>
                )}

                <div className="flex items-center gap-3 mb-4 text-xs text-gray-400">
                  {resource.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {resource.location.name}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {resource.capacity}
                  </span>
                </div>

                {/* Rates */}
                <div className="flex gap-2 flex-wrap mb-4">
                  {resource.hourlyRate != null && (
                    <span className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-lg border border-gray-100">
                      {formatCurrency(resource.hourlyRate, currency)}/hr
                    </span>
                  )}
                  {resource.halfDayRate != null && (
                    <span className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-lg border border-gray-100">
                      {formatCurrency(resource.halfDayRate, currency)}/half day
                    </span>
                  )}
                  {resource.fullDayRate != null && (
                    <span className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-lg border border-gray-100">
                      {formatCurrency(resource.fullDayRate, currency)}/day
                    </span>
                  )}
                  {resource.monthlyRate != null && (
                    <span className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-lg border border-gray-100">
                      {formatCurrency(resource.monthlyRate, currency)}/mo
                    </span>
                  )}
                  {resource.hourlyRate == null &&
                    resource.halfDayRate == null &&
                    resource.fullDayRate == null &&
                    resource.monthlyRate == null && (
                      <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg border border-emerald-100">
                        Included with membership
                      </span>
                    )}
                </div>

                {/* Amenities */}
                {resource.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {resource.amenities.slice(0, 3).map((a) => (
                      <span
                        key={a}
                        className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md"
                      >
                        {a}
                      </span>
                    ))}
                    {resource.amenities.length > 3 && (
                      <span className="text-[10px] text-gray-400">
                        +{resource.amenities.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-auto flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 text-sm"
                    onClick={(e) => { e.stopPropagation(); openDetail(resource); }}
                  >
                    Details
                  </Button>
                  <Button
                    className="flex-1 text-white text-sm"
                    style={{ background: "linear-gradient(135deg, #16A34A, #15803D)" }}
                    onClick={(e) => { e.stopPropagation(); setSelectedResource(resource); }}
                  >
                    <Calendar className="w-3.5 h-3.5 mr-1.5" />
                    Book
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking dialog */}
      <Dialog
        open={!!selectedResource}
        onOpenChange={(open) => !open && setSelectedResource(null)}
      >
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedResource && (
                <ResourceIcon type={selectedResource.type as ResourceType} size="sm" />
              )}
              <span>Book {selectedResource?.name}</span>
            </DialogTitle>
          </DialogHeader>

          {selectedResource?.images && selectedResource.images.length > 0 && (
            <div className="rounded-xl overflow-hidden bg-gray-100 -mt-1 mb-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selectedResource.images[0]} alt={selectedResource.name} className="w-full h-40 object-cover" />
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="booking-title" className="text-sm font-medium text-gray-700">
                Title (optional)
              </Label>
              <Input
                id="booking-title"
                placeholder="e.g. Team standup"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="booking-date" className="text-sm font-medium text-gray-700">
                Date
              </Label>
              <Input
                id="booking-date"
                type="date"
                min={todayString()}
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="booking-start" className="text-sm font-medium text-gray-700">
                  Start time
                </Label>
                <Input
                  id="booking-start"
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="booking-end" className="text-sm font-medium text-gray-700">
                  End time
                </Label>
                <Input
                  id="booking-end"
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                  className="text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="booking-attendees" className="text-sm font-medium text-gray-700">
                Attendees
              </Label>
              <Input
                id="booking-attendees"
                type="number"
                min={1}
                max={selectedResource?.capacity ?? 1}
                value={form.attendees}
                onChange={(e) =>
                  setForm((f) => ({ ...f, attendees: Number(e.target.value) }))
                }
                className="text-sm"
              />
              {selectedResource && (
                <p className="text-xs text-gray-400">
                  Capacity: {selectedResource.capacity} people
                </p>
              )}
            </div>

            {/* Price / credit preview — exactly what the booking will cost */}
            {preview && (
              <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Duration
                  </span>
                  <span className="font-medium text-gray-700">{formatDuration(preview.durationHours)}</span>
                </div>

                {preview.amount === 0 ? (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Cost
                    </span>
                    <span className="font-semibold text-emerald-600">Included with membership</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> Credit cost
                      </span>
                      <span className="font-medium text-gray-700">
                        {preview.creditsNeeded} credit{preview.creditsNeeded !== 1 ? "s" : ""}
                        <span className="text-gray-400 font-normal"> (you have {credits})</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400 flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5" /> Cash price
                      </span>
                      <span className="font-medium text-gray-700">{formatCurrency(preview.amount, currency)}</span>
                    </div>
                    <div className="pt-2 border-t border-gray-200/70 flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700">You pay</span>
                      {preview.canUseCredits ? (
                        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600">
                          <Sparkles className="w-4 h-4" />
                          {preview.creditsNeeded} credit{preview.creditsNeeded !== 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-sm font-bold text-gray-900">
                          {formatCurrency(preview.amount, currency)}
                        </span>
                      )}
                    </div>
                    {!preview.canUseCredits && preview.creditsNeeded > credits && (
                      <p className="text-[11px] text-amber-600">
                        Not enough credits ({preview.creditsNeeded} needed) — this booking will be charged in cash.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {selectedResource?.requiresApproval && (
              <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-xs text-amber-700">
                This space requires admin approval. Your booking will show as &quot;Pending&quot; until approved.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedResource(null)}
              disabled={submitting}
              className="text-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="text-white text-sm"
              style={{ background: "linear-gradient(135deg, #16A34A, #15803D)" }}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  Booking...
                </>
              ) : (
                "Confirm booking"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Booking confirmation — details + QR check-in */}
      <Dialog open={!!confirmed} onOpenChange={(open) => !open && setConfirmed(null)}>
        <DialogContent className="sm:max-w-md">
          {confirmed && (
            <>
              <div className="text-center pt-2">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{
                    background:
                      confirmed.status === "PENDING"
                        ? "rgba(217,119,6,0.12)"
                        : "rgba(22,163,74,0.12)",
                  }}
                >
                  {confirmed.status === "PENDING" ? (
                    <Clock className="w-7 h-7 text-amber-600" />
                  ) : (
                    <CalendarCheck className="w-7 h-7 text-emerald-600" />
                  )}
                </div>
                <h2 className="text-lg font-bold text-gray-900">
                  {confirmed.status === "PENDING" ? "Booking requested" : "Booking confirmed!"}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {confirmed.status === "PENDING"
                    ? "Awaiting admin approval — you'll be notified once it's confirmed."
                    : "You're all set. Show the QR code below at the front desk to check in."}
                </p>
              </div>

              {/* Booking details */}
              <div className="dashboard-card p-4 mt-2">
                <dl className="space-y-2.5 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-gray-400">Space</dt>
                    <dd className="font-medium text-gray-800 text-right">{confirmed.resourceName}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-gray-400">Date</dt>
                    <dd className="font-medium text-gray-800 text-right">{formatDate(confirmed.date)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-gray-400">Time</dt>
                    <dd className="font-medium text-gray-800 text-right">
                      {formatTime(confirmed.start)} – {formatTime(confirmed.end)}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* QR — only meaningful for confirmed bookings */}
              {confirmed.status !== "PENDING" && confirmed.checkinUrl && (
                <div className="flex flex-col items-center mt-3">
                  <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt="Check-in QR code"
                      width={160}
                      height={160}
                      className="w-40 h-40"
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=170x170&margin=8&data=${encodeURIComponent(confirmed.checkinUrl)}`}
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2">Scan at reception to check in</p>
                </div>
              )}

              <DialogFooter className="mt-2">
                <Button
                  variant="outline"
                  className="text-sm"
                  onClick={() => setConfirmed(null)}
                >
                  Book another
                </Button>
                <Button
                  className="text-white text-sm"
                  style={{ background: "linear-gradient(135deg, #16A34A, #15803D)" }}
                  onClick={() => { setConfirmed(null); router.push("/portal/my-bookings"); }}
                >
                  View my bookings
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Space details + image gallery */}
      <Dialog open={!!detailResource} onOpenChange={(open) => !open && setDetailResource(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-y-auto p-0">
          {detailResource && (
            <>
              {/* Gallery */}
              {detailResource.images && detailResource.images.length > 0 ? (
                <div className="relative bg-gray-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={detailResource.images[galleryIndex] ?? detailResource.images[0]}
                    alt={`${detailResource.name} photo ${galleryIndex + 1}`}
                    className="w-full h-64 sm:h-80 object-contain bg-gray-900"
                  />
                  {detailResource.images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => galleryStep(-1, detailResource.images.length)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                        aria-label="Previous photo"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => galleryStep(1, detailResource.images.length)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                        aria-label="Next photo"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                        {detailResource.images.map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setGalleryIndex(i)}
                            aria-label={`Go to photo ${i + 1}`}
                            className={`h-1.5 rounded-full transition-all ${i === galleryIndex ? "w-5 bg-white" : "w-1.5 bg-white/50"}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div
                  className="h-56 w-full flex flex-col items-center justify-center gap-2"
                  style={{ background: (RESOURCE_ICON[detailResource.type as ResourceType] ?? RESOURCE_ICON.OTHER).bg }}
                >
                  <ResourceIcon type={detailResource.type as ResourceType} size="lg" className="!bg-white/70" />
                  <span className="text-xs font-medium" style={{ color: (RESOURCE_ICON[detailResource.type as ResourceType] ?? RESOURCE_ICON.OTHER).tint }}>
                    No photos available
                  </span>
                </div>
              )}

              {/* Thumbnail strip */}
              {detailResource.images && detailResource.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto px-5 pt-4 -mb-1">
                  {detailResource.images.map((img, i) => (
                    <button
                      key={img}
                      type="button"
                      onClick={() => setGalleryIndex(i)}
                      className={`relative h-14 w-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${i === galleryIndex ? "border-emerald-500" : "border-transparent opacity-70 hover:opacity-100"}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt={`Thumbnail ${i + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Details body */}
              <div className="p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-gray-900 leading-tight">{detailResource.name}</h2>
                    <p className="text-sm text-gray-400 mt-0.5">{humanizeEnum(detailResource.type)}</p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold flex-shrink-0 ${
                      detailResource.requiresApproval
                        ? "bg-amber-50 text-amber-700 border border-amber-100"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                    }`}
                  >
                    {detailResource.requiresApproval ? (
                      <><ShieldCheck className="w-3.5 h-3.5" /> Needs approval</>
                    ) : (
                      <><Zap className="w-3.5 h-3.5" /> Instant booking</>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  {detailResource.location && (
                    <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{detailResource.location.name}</span>
                  )}
                  <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />Up to {detailResource.capacity}</span>
                </div>

                {detailResource.description && (
                  <p className="text-sm text-gray-600 leading-relaxed">{detailResource.description}</p>
                )}

                {/* Rates */}
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Rates</p>
                  <div className="flex gap-2 flex-wrap">
                    {detailResource.hourlyRate != null && (
                      <span className="text-sm bg-gray-50 text-gray-700 px-2.5 py-1 rounded-lg border border-gray-100">{formatCurrency(detailResource.hourlyRate, currency)}/hr</span>
                    )}
                    {detailResource.halfDayRate != null && (
                      <span className="text-sm bg-gray-50 text-gray-700 px-2.5 py-1 rounded-lg border border-gray-100">{formatCurrency(detailResource.halfDayRate, currency)}/half day</span>
                    )}
                    {detailResource.fullDayRate != null && (
                      <span className="text-sm bg-gray-50 text-gray-700 px-2.5 py-1 rounded-lg border border-gray-100">{formatCurrency(detailResource.fullDayRate, currency)}/day</span>
                    )}
                    {detailResource.monthlyRate != null && (
                      <span className="text-sm bg-gray-50 text-gray-700 px-2.5 py-1 rounded-lg border border-gray-100">{formatCurrency(detailResource.monthlyRate, currency)}/mo</span>
                    )}
                    {detailResource.hourlyRate == null &&
                      detailResource.halfDayRate == null &&
                      detailResource.fullDayRate == null &&
                      detailResource.monthlyRate == null && (
                        <span className="text-sm text-emerald-700">Included with membership</span>
                      )}
                  </div>
                </div>

                {/* Amenities */}
                {detailResource.amenities.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Amenities</p>
                    <div className="flex flex-wrap gap-1.5">
                      {detailResource.amenities.map((a) => (
                        <span key={a} className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md">
                          <Check className="w-3 h-3" />{a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <Button variant="outline" className="flex-1 text-sm" onClick={() => setDetailResource(null)}>
                    Close
                  </Button>
                  <Button
                    className="flex-1 text-white text-sm"
                    style={{ background: "linear-gradient(135deg, #16A34A, #15803D)" }}
                    onClick={() => bookFromDetail(detailResource)}
                  >
                    <Calendar className="w-4 h-4 mr-1.5" /> Book this space
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
