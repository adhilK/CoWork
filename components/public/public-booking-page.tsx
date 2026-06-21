"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addMinutes, setHours, setMinutes, addDays, isBefore, startOfDay } from "date-fns";
import { toast, Toaster } from "sonner";
import {
  Building2, Users, Clock, ChevronRight, ChevronLeft,
  CheckCircle2, Loader2, CalendarDays, Wifi, Monitor, Video,
  Coffee, Phone, MapPin, CreditCard, ArrowRight,
  Star, Shield, ZoomIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, formatCurrency } from "@/lib/utils";
import type { ResourceType } from "@prisma/client";

// ── Types ─────────────────────────────────────────────────────────────────────

type Org = {
  id: string; name: string; slug: string; logo: string | null;
  address: string | null; currency: string; timezone: string;
};

type Resource = {
  id: string; name: string; type: ResourceType; description: string | null;
  capacity: number;
  hourlyRate: number | null; halfDayRate: number | null; fullDayRate: number | null;
  externalHourlyRate: number | null;
  amenities: string[]; images: string[];
  minBookingMinutes: number; maxBookingHours: number; advanceBookingDays: number;
};

type BookedSlot = { startTime: string; endTime: string };

type Step = "pick-resource" | "resource-detail" | "pick-time" | "details" | "payment" | "success";

// ── Zod schema for guest form ─────────────────────────────────────────────────

const guestSchema = z.object({
  guestName: z.string().min(1, "Name is required").max(100),
  guestEmail: z.string().email("Valid email required"),
  guestPhone: z.string().max(20).optional(),
  purpose: z.string().max(300).optional(),
  attendees: z.number().int().min(1).max(500).default(1),
});
type GuestInput = z.infer<typeof guestSchema>;

// ── Resource type config ──────────────────────────────────────────────────────

const TYPE_LABELS: Record<ResourceType, string> = {
  HOT_DESK: "Hot desk", DEDICATED_DESK: "Dedicated desk",
  PRIVATE_OFFICE: "Private office", MEETING_ROOM: "Meeting room",
  EVENT_SPACE: "Event space", PHONE_BOOTH: "Phone booth",
  PODCAST_ROOM: "Podcast room", OTHER: "Space",
};

const TYPE_COLORS: Partial<Record<ResourceType, string>> = {
  MEETING_ROOM: "#2563EB",
  PRIVATE_OFFICE: "#7C3AED",
  EVENT_SPACE: "#D97706",
  HOT_DESK: "#16A34A",
  DEDICATED_DESK: "#0891B2",
};

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  "WiFi": <Wifi className="w-3.5 h-3.5" />,
  "TV": <Monitor className="w-3.5 h-3.5" />,
  "Video call setup": <Video className="w-3.5 h-3.5" />,
  "Whiteboard": <Monitor className="w-3.5 h-3.5" />,
  "Coffee": <Coffee className="w-3.5 h-3.5" />,
  "Phone": <Phone className="w-3.5 h-3.5" />,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function effectiveHourlyRate(r: Resource): number | null {
  return r.externalHourlyRate ?? r.hourlyRate;
}

function getPriceLabel(r: Resource, currency: string) {
  const hr = effectiveHourlyRate(r);
  if (hr) return `${formatCurrency(hr, currency)}/hr`;
  if (r.fullDayRate) return `${formatCurrency(r.fullDayRate, currency)}/day`;
  if (r.halfDayRate) return `${formatCurrency(r.halfDayRate, currency)}/half-day`;
  return "Free";
}

function computeTotal(r: Resource, startTime: Date, endTime: Date): number {
  const hrs = (endTime.getTime() - startTime.getTime()) / 3600000;
  const hr = effectiveHourlyRate(r);
  if (hr) return Math.round(hr * hrs * 100) / 100;
  if (hrs >= 7 && r.fullDayRate) return r.fullDayRate;
  if (hrs >= 3.5 && r.halfDayRate) return r.halfDayRate;
  return 0;
}

function generateSlots(date: Date): Date[] {
  const slots: Date[] = [];
  const base = startOfDay(date);
  for (let h = 7; h < 21; h++) {
    slots.push(setMinutes(setHours(base, h), 0));
    slots.push(setMinutes(setHours(base, h), 30));
  }
  return slots;
}

function isSlotBooked(slot: Date, duration: number, booked: BookedSlot[]): boolean {
  const slotEnd = addMinutes(slot, duration);
  return booked.some((b) => {
    const bs = new Date(b.startTime);
    const be = new Date(b.endTime);
    return slot < be && slotEnd > bs;
  });
}

function fmtDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  if (mins % 60 === 0) return `${mins / 60}h`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

// ── Step indicator ────────────────────────────────────────────────────────────

function StepDots({ step }: { step: Step }) {
  const steps: Step[] = ["pick-resource", "pick-time", "details"];
  const idx = steps.indexOf(step);
  if (idx === -1) return null;
  return (
    <div className="flex items-center justify-center gap-2 py-2">
      {steps.map((s, i) => (
        <div
          key={s}
          className={cn(
            "rounded-full transition-all",
            i === idx ? "w-6 h-2 bg-emerald-600" :
            i < idx ? "w-2 h-2 bg-emerald-300" :
            "w-2 h-2 bg-gray-200"
          )}
        />
      ))}
    </div>
  );
}

// ── Resource card ─────────────────────────────────────────────────────────────

const TYPE_ICONS: Partial<Record<ResourceType, React.ReactNode>> = {
  MEETING_ROOM: <Monitor className="w-7 h-7" />,
  PRIVATE_OFFICE: <Building2 className="w-7 h-7" />,
  EVENT_SPACE: <Star className="w-7 h-7" />,
  HOT_DESK: <Users className="w-7 h-7" />,
  DEDICATED_DESK: <Users className="w-7 h-7" />,
  PHONE_BOOTH: <Phone className="w-7 h-7" />,
  PODCAST_ROOM: <Video className="w-7 h-7" />,
};

function ResourceCard({ r, currency, onSelect }: { r: Resource; currency: string; onSelect: () => void }) {
  const accent = TYPE_COLORS[r.type] ?? "#16A34A";
  const hasImage = r.images.length > 0;
  const Icon = TYPE_ICONS[r.type] ?? <Building2 className="w-7 h-7" />;

  return (
    <button
      onClick={onSelect}
      className="w-full text-left bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-emerald-300 hover:shadow-lg transition-all duration-200 group flex flex-col"
    >
      {/* Image or styled placeholder */}
      {hasImage ? (
        <div className="relative h-44 overflow-hidden bg-gray-100 flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={r.images[0]}
            alt={r.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-3 left-3">
            <span className="text-[11px] font-semibold text-white bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-full">
              {TYPE_LABELS[r.type]}
            </span>
          </div>
          <div className="absolute top-3 right-3">
            <span className="text-sm font-bold text-white bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full">
              {getPriceLabel(r, currency)}
            </span>
          </div>
          {r.images.length > 1 && (
            <div className="absolute bottom-3 right-3 flex items-center gap-0.5">
              {r.images.slice(0, 4).map((_, i) => (
                <div key={i} className={cn("rounded-full", i === 0 ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50")} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div
          className="h-28 flex-shrink-0 flex flex-col items-center justify-center gap-2 relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${accent}18, ${accent}30)` }}
        >
          <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-10" style={{ background: accent }} />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full opacity-10" style={{ background: accent }} />
          <span style={{ color: accent }}>{Icon}</span>
          <span
            className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
            style={{ background: `${accent}22`, color: accent }}
          >
            {TYPE_LABELS[r.type]}
          </span>
        </div>
      )}

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-bold text-gray-900 text-[15px] leading-snug">{r.name}</h2>
          {!hasImage && (
            <p className="text-base font-bold flex-shrink-0" style={{ color: accent }}>
              {getPriceLabel(r, currency)}
            </p>
          )}
        </div>

        {r.description && (
          <p className="text-sm text-gray-500 mt-1.5 line-clamp-2 leading-snug">{r.description}</p>
        )}

        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
            <Users className="w-3 h-3" /> {r.capacity}
          </span>
          {r.amenities.slice(0, 2).map((a) => (
            <span key={a} className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
              {AMENITY_ICONS[a] ?? null} {a}
            </span>
          ))}
          {r.amenities.length > 2 && (
            <span className="text-xs text-gray-400">+{r.amenities.length - 2}</span>
          )}
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Min {fmtDuration(r.minBookingMinutes)}
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 group-hover:gap-2 transition-all">
            {r.images.length > 0 ? "View & book" : "Book now"} <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </button>
  );
}

// ── Resource detail view ──────────────────────────────────────────────────────

function ResourceDetail({
  r,
  currency,
  onBack,
  onBook,
}: {
  r: Resource;
  currency: string;
  onBack: () => void;
  onBook: () => void;
}) {
  const [imgIdx, setImgIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const accent = TYPE_COLORS[r.type] ?? "#16A34A";
  const Icon = TYPE_ICONS[r.type] ?? <Building2 className="w-10 h-10" />;
  const hasImages = r.images.length > 0;

  function prevImg() { setImgIdx((i) => Math.max(0, i - 1)); }
  function nextImg() { setImgIdx((i) => Math.min(r.images.length - 1, i + 1)); }

  return (
    <>
      {/* Lightbox overlay */}
      {lightbox && hasImages && (
        <div
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onClick={() => setLightbox(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={r.images[imgIdx]}
            alt={r.name}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
            onClick={() => setLightbox(false)}
          >
            ✕
          </button>
          {r.images.length > 1 && (
            <>
              <button
                disabled={imgIdx === 0}
                onClick={(e) => { e.stopPropagation(); prevImg(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 disabled:opacity-30"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                disabled={imgIdx === r.images.length - 1}
                onClick={(e) => { e.stopPropagation(); nextImg(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 disabled:opacity-30"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>
      )}

      {/* Break out of the container's px-4 pt-6 with negative margins */}
      <div className="-mx-4 -mt-6">

        {/* Hero image / placeholder */}
        {hasImages ? (
          <div className="relative" style={{ aspectRatio: "16/9" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={r.images[imgIdx]}
              alt={r.name}
              className="w-full h-full object-cover"
            />

            {/* Dark gradient at top for back button legibility */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/30 pointer-events-none" />

            {/* Back button */}
            <button
              onClick={onBack}
              className="absolute top-4 left-4 w-9 h-9 rounded-xl bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Expand to lightbox */}
            <button
              onClick={() => setLightbox(true)}
              className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            {/* Left / right nav arrows (if multiple) */}
            {r.images.length > 1 && (
              <>
                <button
                  disabled={imgIdx === 0}
                  onClick={prevImg}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 disabled:opacity-0 transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  disabled={imgIdx === r.images.length - 1}
                  onClick={nextImg}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 disabled:opacity-0 transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Dot indicators */}
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
                  {r.images.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => { e.stopPropagation(); setImgIdx(i); }}
                      className={cn(
                        "rounded-full transition-all pointer-events-auto",
                        i === imgIdx ? "w-5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50 hover:bg-white/70"
                      )}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Image count badge */}
            {r.images.length > 1 && (
              <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">
                {imgIdx + 1}/{r.images.length}
              </div>
            )}
          </div>
        ) : (
          /* No-image placeholder — full bleed */
          <div
            className="relative flex flex-col items-center justify-center gap-3 py-16"
            style={{ background: `linear-gradient(135deg, ${accent}22, ${accent}40)` }}
          >
            <div className="absolute -top-6 -right-6 w-36 h-36 rounded-full opacity-10" style={{ background: accent }} />
            <div className="absolute -bottom-8 -left-8 w-44 h-44 rounded-full opacity-10" style={{ background: accent }} />
            <span style={{ color: accent }}>{Icon}</span>
            <span
              className="text-sm font-bold px-3 py-1 rounded-full"
              style={{ background: `${accent}30`, color: accent }}
            >
              {TYPE_LABELS[r.type]}
            </span>

            {/* Back button over placeholder */}
            <button
              onClick={onBack}
              className="absolute top-4 left-4 w-9 h-9 rounded-xl bg-white/60 backdrop-blur-sm flex items-center justify-center hover:bg-white/80 transition-colors"
              style={{ color: accent }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Thumbnail strip (only when 2+ images) */}
        {r.images.length > 1 && (
          <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-none bg-white border-b border-gray-100">
            {r.images.map((src, i) => (
              <button
                key={i}
                onClick={() => setImgIdx(i)}
                className={cn(
                  "flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all",
                  i === imgIdx ? "border-emerald-500 scale-105" : "border-transparent opacity-60 hover:opacity-90"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* ── Detail content (scrollable) ───────────────────────────────────── */}
        <div className="px-4 pt-5 pb-36 space-y-5 bg-white">

          {/* Name + price */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">{r.name}</h1>
              <span
                className="inline-block mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                style={{ background: `${accent}18`, color: accent }}
              >
                {TYPE_LABELS[r.type]}
              </span>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-2xl font-extrabold" style={{ color: accent }}>
                {getPriceLabel(r, currency)}
              </p>
            </div>
          </div>

          {/* Description */}
          {r.description && (
            <p className="text-gray-600 leading-relaxed text-[15px]">{r.description}</p>
          )}

          {/* Key facts */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Capacity</p>
              <p className="text-lg font-bold text-gray-900 mt-0.5">{r.capacity}</p>
              <p className="text-[10px] text-gray-400">{r.capacity === 1 ? "person" : "people"}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Min booking</p>
              <p className="text-lg font-bold text-gray-900 mt-0.5">{fmtDuration(r.minBookingMinutes)}</p>
              <p className="text-[10px] text-gray-400 invisible">·</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Max booking</p>
              <p className="text-lg font-bold text-gray-900 mt-0.5">{r.maxBookingHours}h</p>
              <p className="text-[10px] text-gray-400 invisible">·</p>
            </div>
          </div>

          {/* Amenities */}
          {r.amenities.length > 0 && (
            <div>
              <p className="text-sm font-bold text-gray-700 mb-3">Amenities</p>
              <div className="flex flex-wrap gap-2">
                {r.amenities.map((a) => (
                  <span
                    key={a}
                    className="inline-flex items-center gap-1.5 text-sm text-gray-600 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-full"
                  >
                    {AMENITY_ICONS[a] ?? null}
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Booking rules */}
          <div className="border border-gray-100 rounded-2xl divide-y divide-gray-50">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-gray-500">Advance booking window</span>
              <span className="text-sm font-semibold text-gray-900">Up to {r.advanceBookingDays} days ahead</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-gray-500">Minimum duration</span>
              <span className="text-sm font-semibold text-gray-900">{fmtDuration(r.minBookingMinutes)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-gray-500">Maximum duration</span>
              <span className="text-sm font-semibold text-gray-900">{r.maxBookingHours} hours</span>
            </div>
          </div>

        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 inset-x-0 z-40 px-4 pb-6 pt-3 bg-white/95 backdrop-blur-md border-t border-gray-100 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{r.name}</p>
            <p className="text-xs text-gray-400">{TYPE_LABELS[r.type]}</p>
          </div>
          <div className="text-right flex-shrink-0 mr-3">
            <p className="text-lg font-extrabold text-gray-900">{getPriceLabel(r, currency)}</p>
          </div>
          <Button
            onClick={onBook}
            className="text-white font-bold flex-shrink-0 h-11 px-6"
            style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}
          >
            Book now <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PublicBookingPage({
  org,
  resources,
  paymentEnabled = false,
}: {
  org: Org;
  resources: Resource[];
  paymentEnabled?: boolean;
}) {
  const [step, setStep] = useState<Step>("pick-resource");
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(addDays(new Date(), 1));
  const [selectedStart, setSelectedStart] = useState<Date | null>(null);
  const [durationMins, setDurationMins] = useState(60);
  const [booked, setBooked] = useState<BookedSlot[]>([]);
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{
    resourceName: string; startTime: string; endTime: string;
    total: number; checkoutUrl: string | null; isPaid: boolean;
  } | null>(null);

  const today = startOfDay(new Date());
  const minDate = today;
  const maxDate = selectedResource ? addDays(today, selectedResource.advanceBookingDays) : addDays(today, 30);

  useEffect(() => {
    if (!selectedResource || !selectedDate) return;
    setLoadingAvail(true);
    setSelectedStart(null);
    fetch(`/api/public/${org.slug}/availability?resourceId=${selectedResource.id}&date=${format(selectedDate, "yyyy-MM-dd")}`)
      .then((r) => r.json())
      .then((d) => setBooked(d.data?.booked ?? []))
      .catch(() => setBooked([]))
      .finally(() => setLoadingAvail(false));
  }, [selectedResource, selectedDate, org.slug]);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<GuestInput>({
    resolver: zodResolver(guestSchema) as any,
    defaultValues: { attendees: 1 },
  });

  async function onSubmit(data: GuestInput) {
    if (!selectedResource || !selectedStart) return;
    const endTime = addMinutes(selectedStart, durationMins);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/${org.slug}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceId: selectedResource.id,
          startTime: selectedStart.toISOString(),
          endTime: endTime.toISOString(),
          ...data,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to submit booking");

      const total = computeTotal(selectedResource, selectedStart, endTime);
      const checkoutUrl = json.data?.checkoutUrl ?? null;

      if (checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }

      setSuccessData({
        resourceName: json.data?.resourceName ?? selectedResource.name,
        startTime: json.data?.startTime ?? selectedStart.toISOString(),
        endTime: json.data?.endTime ?? endTime.toISOString(),
        total,
        checkoutUrl: null,
        isPaid: false,
      });
      setStep("success");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetFlow() {
    setStep("pick-resource");
    setSelectedResource(null);
    setSelectedStart(null);
    setSuccessData(null);
    reset();
  }

  const slots = selectedDate ? generateSlots(selectedDate) : [];
  const endTime = selectedStart ? addMinutes(selectedStart, durationMins) : null;
  const total = selectedResource && selectedStart && endTime
    ? computeTotal(selectedResource, selectedStart, endTime)
    : 0;

  const durationOptions = [30, 60, 90, 120, 180, 240, 300, 360, 420, 480].filter(
    (m) => !selectedResource || m <= selectedResource.maxBookingHours * 60
  );

  return (
    <>
      <Toaster position="top-center" />
      <div className="min-h-screen" style={{ background: "linear-gradient(160deg, #f0fdf4 0%, #f8fafc 40%, #ffffff 100%)" }}>

        {/* Header — hidden when in resource-detail (detail has its own back button on the image) */}
        {step !== "resource-detail" && (
          <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3">
            <div className="max-w-3xl mx-auto flex items-center gap-3">
              {org.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={org.logo} alt={org.name} className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}
                >
                  <Building2 className="w-5 h-5 text-white" />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-bold text-gray-900 text-sm leading-tight truncate">{org.name}</p>
                {org.address && (
                  <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                    <MapPin className="w-3 h-3 flex-shrink-0" /> {org.address}
                  </p>
                )}
              </div>
              <div className="ml-auto flex items-center gap-2 flex-shrink-0">
                <span className="hidden sm:flex items-center gap-1 text-[11px] text-gray-400">
                  <Shield className="w-3.5 h-3.5 text-emerald-500" /> Secure booking
                </span>
              </div>
            </div>
          </header>
        )}

        <div className={cn(
          "max-w-3xl mx-auto px-4 pb-20",
          step === "resource-detail" ? "pt-0" : "pt-6"
        )}>

          {/* ── STEP 1: Pick resource ────────────────────────────────────────── */}
          {step === "pick-resource" && (
            <div className="space-y-5 animate-fade-in">
              <div className="text-center pb-2">
                <h1 className="text-2xl font-extrabold text-gray-900">Book a space</h1>
                <p className="text-gray-500 mt-1 text-sm">
                  Choose the space you want to book at{" "}
                  <span className="font-medium text-gray-700">{org.name}</span>.
                </p>
              </div>

              {resources.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <Building2 className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-gray-500 font-medium">No spaces available for booking right now.</p>
                  <p className="text-sm text-gray-400 mt-1">Please contact us directly to arrange a booking.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {resources.map((r) => (
                    <ResourceCard
                      key={r.id}
                      r={r}
                      currency={org.currency}
                      onSelect={() => {
                        setSelectedResource(r);
                        setStep("resource-detail");
                      }}
                    />
                  ))}
                </div>
              )}

              <div className="flex items-center justify-center gap-6 pt-4 text-xs text-gray-400">
                <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-emerald-400" /> Secure</span>
                <span className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-amber-400" /> Instant confirmation</span>
                <span className="flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5 text-blue-400" /> Pay online</span>
              </div>
            </div>
          )}

          {/* ── STEP 1b: Resource detail ─────────────────────────────────────── */}
          {step === "resource-detail" && selectedResource && (
            <ResourceDetail
              r={selectedResource}
              currency={org.currency}
              onBack={() => setStep("pick-resource")}
              onBook={() => setStep("pick-time")}
            />
          )}

          {/* ── STEP 2: Pick date + time ─────────────────────────────────────── */}
          {step === "pick-time" && selectedResource && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setStep("resource-detail")}
                  className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors flex-shrink-0"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-500" />
                </button>
                <div className="min-w-0">
                  <h1 className="text-xl font-bold text-gray-900 truncate">{selectedResource.name}</h1>
                  <p className="text-sm text-gray-400">{TYPE_LABELS[selectedResource.type]} · {getPriceLabel(selectedResource, org.currency)}</p>
                </div>
              </div>
              <StepDots step={step} />

              {/* Date */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 shadow-sm">
                <Label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <CalendarDays className="w-4 h-4 text-emerald-500" /> Date
                </Label>
                <Input
                  type="date"
                  value={format(selectedDate, "yyyy-MM-dd")}
                  min={format(minDate, "yyyy-MM-dd")}
                  max={format(maxDate, "yyyy-MM-dd")}
                  className="max-w-[200px] text-base"
                  onChange={(e) => {
                    if (e.target.value) setSelectedDate(new Date(e.target.value + "T12:00:00"));
                  }}
                />
              </div>

              {/* Duration */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 shadow-sm">
                <Label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Clock className="w-4 h-4 text-emerald-500" /> Duration
                </Label>
                <div className="flex flex-wrap gap-2">
                  {durationOptions.map((m) => (
                    <button
                      key={m}
                      onClick={() => { setDurationMins(m); setSelectedStart(null); }}
                      className={cn(
                        "px-3 py-2 rounded-xl text-sm font-semibold border transition-all",
                        durationMins === m
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                          : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50"
                      )}
                    >
                      {fmtDuration(m)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time slots */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 shadow-sm">
                <Label className="text-sm font-semibold text-gray-700">Start time</Label>
                {loadingAvail ? (
                  <div className="flex items-center gap-2 text-gray-400 py-4">
                    <Loader2 className="w-4 h-4 animate-spin" /> Checking availability…
                  </div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {slots.map((slot) => {
                      const isPast = isBefore(slot, new Date());
                      const isBooked = isSlotBooked(slot, durationMins, booked);
                      const isSelected = selectedStart?.getTime() === slot.getTime();
                      const disabled = isPast || isBooked;
                      return (
                        <button
                          key={slot.toISOString()}
                          disabled={disabled}
                          onClick={() => setSelectedStart(isSelected ? null : slot)}
                          className={cn(
                            "py-2.5 rounded-xl text-sm font-semibold transition-all border",
                            disabled && "opacity-30 cursor-not-allowed bg-gray-50 text-gray-400 border-transparent line-through",
                            !disabled && !isSelected && "bg-white text-gray-700 border-gray-200 hover:border-emerald-400 hover:bg-emerald-50",
                            isSelected && "bg-emerald-600 text-white border-emerald-600 shadow-sm scale-105"
                          )}
                        >
                          {format(slot, "HH:mm")}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedStart && endTime && (
                <div
                  className="sticky bottom-4 bg-white rounded-2xl border border-emerald-200 shadow-lg p-4 flex items-center justify-between gap-3"
                  style={{ boxShadow: "0 4px 24px rgba(21,128,61,0.15)" }}
                >
                  <div>
                    <p className="font-bold text-gray-900 text-sm">
                      {format(selectedDate, "EEE d MMM")} · {format(selectedStart, "HH:mm")}–{format(endTime, "HH:mm")}
                    </p>
                    {total > 0 && (
                      <p className="text-emerald-600 font-bold text-base">{formatCurrency(total, org.currency)}</p>
                    )}
                  </div>
                  <Button
                    onClick={() => setStep("details")}
                    className="text-white font-semibold flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}
                  >
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}

              {!selectedStart && (
                <Button
                  disabled
                  className="w-full h-12 text-white font-semibold opacity-40"
                  style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}
                >
                  Select a start time to continue
                </Button>
              )}
            </div>
          )}

          {/* ── STEP 3: Guest details ────────────────────────────────────────── */}
          {step === "details" && selectedResource && selectedStart && endTime && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setStep("pick-time")}
                  className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors flex-shrink-0"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-500" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Your details</h1>
                  <p className="text-sm text-gray-400">Almost there — a few quick details.</p>
                </div>
              </div>
              <StepDots step={step} />

              {/* Booking summary */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Booking summary</p>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <p className="font-bold text-gray-900">{selectedResource.name}</p>
                    <p className="text-sm text-gray-500">{format(selectedDate, "EEEE, d MMMM yyyy")}</p>
                    <p className="text-sm text-gray-500">
                      {format(selectedStart, "HH:mm")} – {format(endTime, "HH:mm")}
                      <span className="text-gray-400 ml-1.5 text-xs">({fmtDuration(durationMins)})</span>
                    </p>
                  </div>
                  {total > 0 ? (
                    <div className="text-right flex-shrink-0">
                      <p className="text-2xl font-extrabold text-gray-900">{formatCurrency(total, org.currency)}</p>
                      <p className="text-xs text-gray-400">excl. VAT</p>
                    </div>
                  ) : (
                    <span className="text-sm font-semibold text-emerald-600 flex-shrink-0">Free</span>
                  )}
                </div>
              </div>

              {/* Guest form */}
              <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-4">
                <p className="text-sm font-semibold text-gray-700">Contact information</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Full name *</Label>
                    <Input
                      placeholder="Jane Smith"
                      className="h-11 text-base"
                      autoComplete="name"
                      {...register("guestName")}
                    />
                    {errors.guestName && <p className="text-xs text-red-500">{errors.guestName.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Email *</Label>
                    <Input
                      type="email"
                      placeholder="jane@company.com"
                      className="h-11 text-base"
                      autoComplete="email"
                      {...register("guestEmail")}
                    />
                    {errors.guestEmail && <p className="text-xs text-red-500">{errors.guestEmail.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Phone <span className="text-gray-400 font-normal">(optional)</span></Label>
                    <Input
                      type="tel"
                      placeholder="+971 50 123 4567"
                      className="h-11 text-base"
                      autoComplete="tel"
                      {...register("guestPhone")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Attendees</Label>
                    <Input
                      type="number"
                      min={1}
                      max={selectedResource.capacity}
                      className="h-11 text-base w-full"
                      {...register("attendees", { valueAsNumber: true })}
                    />
                    <p className="text-xs text-gray-400">Max {selectedResource.capacity}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm">Purpose <span className="text-gray-400 font-normal">(optional)</span></Label>
                  <Input
                    placeholder="e.g. Client meeting, team workshop…"
                    className="h-11"
                    {...register("purpose")}
                  />
                </div>

                {total > 0 && paymentEnabled && (
                  <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-xl p-3.5">
                    <CreditCard className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-blue-800">Secure online payment</p>
                      <p className="text-xs text-blue-600 mt-0.5">
                        You&apos;ll be redirected to pay {formatCurrency(total, org.currency)} securely via Tap Payments after submitting.
                      </p>
                    </div>
                  </div>
                )}
                {total > 0 && !paymentEnabled && (
                  <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-xl p-3.5">
                    <CreditCard className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">
                      Payment will be arranged by {org.name} — they&apos;ll contact you with details after confirming your booking.
                    </p>
                  </div>
                )}
                {total === 0 && (
                  <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-100 rounded-xl p-3.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-emerald-700">
                      This space is free to book. Your reservation will be confirmed shortly.
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-12 text-white font-bold text-base"
                  style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing…</>
                  ) : total > 0 && paymentEnabled ? (
                    <><CreditCard className="w-4 h-4 mr-2" /> Book & pay {formatCurrency(total, org.currency)}</>
                  ) : (
                    <>Confirm booking <CheckCircle2 className="w-4 h-4 ml-2" /></>
                  )}
                </Button>

                <p className="text-center text-[11px] text-gray-400">
                  By booking you agree to the cancellation policy of {org.name}.
                </p>
              </form>
            </div>
          )}

          {/* ── STEP 4: Success ──────────────────────────────────────────────── */}
          {step === "success" && successData && (
            <div className="space-y-6 py-6 text-center">
              <div className="flex justify-center">
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #DCFCE7, #BBF7D0)" }}
                >
                  <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                </div>
              </div>

              <div>
                <h1 className="text-2xl font-extrabold text-gray-900">
                  {successData.isPaid ? "Payment confirmed!" : "Booking request received!"}
                </h1>
                <p className="text-gray-500 text-sm mt-2 max-w-xs mx-auto leading-relaxed">
                  {successData.isPaid
                    ? `Your booking for ${successData.resourceName} is confirmed. Check your email for details.`
                    : `Your request for ${successData.resourceName} has been received. ${org.name} will confirm shortly.`}
                </p>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl p-5 text-left max-w-xs mx-auto shadow-sm space-y-3">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Booking details</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Space</span>
                    <span className="text-sm font-semibold text-gray-900">{successData.resourceName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Date</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {format(new Date(successData.startTime), "d MMM yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Time</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {format(new Date(successData.startTime), "HH:mm")} –{" "}
                      {format(new Date(successData.endTime), "HH:mm")}
                    </span>
                  </div>
                  {successData.total > 0 && (
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <span className="text-sm text-gray-500">Total</span>
                      <span className="text-sm font-bold text-emerald-700">
                        {formatCurrency(successData.total, org.currency)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex justify-center pt-1">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold",
                      successData.isPaid
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    )}
                  >
                    {successData.isPaid ? (
                      <><CheckCircle2 className="w-3 h-3" /> Confirmed</>
                    ) : (
                      "Pending confirmation"
                    )}
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={resetFlow}
                className="border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Book another space
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
