"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addMinutes, setHours, setMinutes, addDays, isBefore, startOfDay } from "date-fns";
import {
  Building2, Users, Clock, ChevronRight, ChevronLeft,
  CheckCircle2, Loader2, CalendarDays, Wifi, Monitor, Video,
  Coffee, Phone, MapPin, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  amenities: string[]; images: string[];
  minBookingMinutes: number; maxBookingHours: number; advanceBookingDays: number;
};

type BookedSlot = { startTime: string; endTime: string };

// ── Zod schema for guest form ─────────────────────────────────────────────────

const guestSchema = z.object({
  guestName: z.string().min(1, "Name is required").max(100),
  guestEmail: z.string().email("Valid email required"),
  purpose: z.string().max(300).optional(),
  attendees: z.number().int().min(1).max(500).default(1),
});
type GuestInput = z.infer<typeof guestSchema>;

// ── Resource type labels & icons ──────────────────────────────────────────────

const TYPE_LABELS: Record<ResourceType, string> = {
  HOT_DESK: "Hot desk", DEDICATED_DESK: "Dedicated desk",
  PRIVATE_OFFICE: "Private office", MEETING_ROOM: "Meeting room",
  EVENT_SPACE: "Event space", PHONE_BOOTH: "Phone booth",
  PODCAST_ROOM: "Podcast room", OTHER: "Space",
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

function getPriceLabel(r: Resource, currency: string) {
  if (r.hourlyRate) return `${formatCurrency(r.hourlyRate, currency)}/hr`;
  if (r.fullDayRate) return `${formatCurrency(r.fullDayRate, currency)}/day`;
  if (r.halfDayRate) return `${formatCurrency(r.halfDayRate, currency)}/half-day`;
  return "Free";
}

function computeTotal(r: Resource, startTime: Date, endTime: Date): number {
  const hrs = (endTime.getTime() - startTime.getTime()) / 3600000;
  if (r.hourlyRate) return Math.round(r.hourlyRate * hrs * 100) / 100;
  if (hrs >= 7 && r.fullDayRate) return r.fullDayRate;
  if (hrs >= 3.5 && r.halfDayRate) return r.halfDayRate;
  return 0;
}

/** Generate 30-minute time slots for a day, 8am–8pm */
function generateSlots(date: Date): Date[] {
  const slots: Date[] = [];
  const base = startOfDay(date);
  for (let h = 8; h < 20; h++) {
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

// ── Main component ────────────────────────────────────────────────────────────

export function PublicBookingPage({ org, resources }: { org: Org; resources: Resource[] }) {
  const [step, setStep] = useState<"pick-resource" | "pick-time" | "details" | "success">("pick-resource");
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(addDays(new Date(), 1));
  const [selectedStart, setSelectedStart] = useState<Date | null>(null);
  const [durationMins, setDurationMins] = useState(60);
  const [booked, setBooked] = useState<BookedSlot[]>([]);
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ resourceName: string; startTime: string; endTime: string } | null>(null);

  const today = startOfDay(new Date());
  const minDate = addDays(today, 0); // today ok
  const maxDate = selectedResource ? addDays(today, selectedResource.advanceBookingDays) : addDays(today, 30);

  // Fetch availability whenever resource or date changes
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

  const { register, handleSubmit, formState: { errors } } = useForm<GuestInput>({
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
      setSuccessData({
        resourceName: json.data?.resourceName ?? selectedResource.name,
        startTime: json.data?.startTime ?? selectedStart.toISOString(),
        endTime: json.data?.endTime ?? endTime.toISOString(),
      });
      setStep("success");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const slots = selectedDate ? generateSlots(selectedDate) : [];
  const endTime = selectedStart ? addMinutes(selectedStart, durationMins) : null;
  const total = selectedResource && selectedStart && endTime
    ? computeTotal(selectedResource, selectedStart, endTime)
    : 0;

  // Duration options capped by maxBookingHours
  const durationOptions = [30, 60, 90, 120, 180, 240, 300, 360, 420, 480].filter(
    (m) => !selectedResource || m <= (selectedResource.maxBookingHours * 60)
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}
        >
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-gray-900 text-base leading-tight">{org.name}</p>
          {org.address && (
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" /> {org.address}
            </p>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 pb-16">

        {/* ── STEP 1: Pick resource ─────────────────────────────────────────── */}
        {step === "pick-resource" && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Book a space</h1>
              <p className="text-gray-500 mt-1 text-sm">Choose the space you want to book at {org.name}.</p>
            </div>

            {resources.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No spaces available for booking right now.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {resources.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => { setSelectedResource(r); setStep("pick-time"); }}
                    className="w-full text-left bg-white rounded-2xl border border-gray-100 p-4 hover:border-emerald-200 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="font-semibold text-gray-900 text-base">{r.name}</h2>
                          <Badge variant="secondary" className="text-[10px] font-medium text-gray-500 bg-gray-100 border-0">
                            {TYPE_LABELS[r.type]}
                          </Badge>
                        </div>
                        {r.description && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{r.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" /> Up to {r.capacity}
                          </span>
                          {r.amenities.slice(0, 4).map((a) => (
                            <span key={a} className="text-xs text-gray-400 flex items-center gap-1">
                              {AMENITY_ICONS[a] ?? <span className="w-3.5 h-3.5" />} {a}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-base font-bold text-emerald-600">{getPriceLabel(r, org.currency)}</p>
                        <ChevronRight className="w-4 h-4 text-gray-300 ml-auto mt-2 group-hover:text-emerald-400 transition-colors" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Pick date + time slot ─────────────────────────────────── */}
        {step === "pick-time" && selectedResource && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <button onClick={() => setStep("pick-resource")} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <ChevronLeft className="w-5 h-5 text-gray-500" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{selectedResource.name}</h1>
                <p className="text-sm text-gray-400">{TYPE_LABELS[selectedResource.type]} · {getPriceLabel(selectedResource, org.currency)}</p>
              </div>
            </div>

            {/* Date picker */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
              <Label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <CalendarDays className="w-4 h-4 text-gray-400" /> Select date
              </Label>
              <Input
                type="date"
                value={format(selectedDate, "yyyy-MM-dd")}
                min={format(minDate, "yyyy-MM-dd")}
                max={format(maxDate, "yyyy-MM-dd")}
                onChange={(e) => {
                  if (e.target.value) setSelectedDate(new Date(e.target.value + "T12:00:00"));
                }}
                className="max-w-[200px]"
              />
            </div>

            {/* Duration */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
              <Label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Clock className="w-4 h-4 text-gray-400" /> Duration
              </Label>
              <div className="flex flex-wrap gap-2">
                {durationOptions.map((m) => (
                  <button
                    key={m}
                    onClick={() => { setDurationMins(m); setSelectedStart(null); }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                      durationMins === m
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300"
                    )}
                  >
                    {m < 60 ? `${m}m` : m % 60 === 0 ? `${m / 60}h` : `${Math.floor(m / 60)}h ${m % 60}m`}
                  </button>
                ))}
              </div>
            </div>

            {/* Time slots */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
              <Label className="text-sm font-semibold text-gray-700">Available start times</Label>
              {loadingAvail ? (
                <div className="flex items-center gap-2 text-gray-400 py-4">
                  <Loader2 className="w-4 h-4 animate-spin" /> Checking availability…
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {slots.map((slot) => {
                    const slotEnd = addMinutes(slot, durationMins);
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
                          "py-2 rounded-xl text-sm font-medium transition-all border",
                          disabled && "opacity-40 cursor-not-allowed bg-gray-50 text-gray-400 border-transparent",
                          !disabled && !isSelected && "bg-white text-gray-700 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50",
                          isSelected && "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        )}
                      >
                        {format(slot, "HH:mm")}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected summary */}
            {selectedStart && endTime && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-emerald-800 text-sm">
                      {format(selectedDate, "EEE d MMM")} · {format(selectedStart, "HH:mm")} – {format(endTime, "HH:mm")}
                    </p>
                    <p className="text-xs text-emerald-600 mt-0.5">{selectedResource.name}</p>
                  </div>
                  {total > 0 && (
                    <p className="text-lg font-bold text-emerald-700">{formatCurrency(total, org.currency)}</p>
                  )}
                </div>
              </div>
            )}

            <Button
              onClick={() => setStep("details")}
              disabled={!selectedStart}
              className="w-full h-11 text-white font-semibold text-base"
              style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}
            >
              Continue <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* ── STEP 3: Guest details ──────────────────────────────────────────── */}
        {step === "details" && selectedResource && selectedStart && endTime && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <button onClick={() => setStep("pick-time")} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <ChevronLeft className="w-5 h-5 text-gray-500" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Your details</h1>
                <p className="text-sm text-gray-400">Almost there — just a few details.</p>
              </div>
            </div>

            {/* Booking summary card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Booking summary</p>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-semibold text-gray-900">{selectedResource.name}</p>
                  <p className="text-sm text-gray-500">
                    {format(selectedDate, "EEEE, d MMMM yyyy")}
                  </p>
                  <p className="text-sm text-gray-500">
                    {format(selectedStart, "HH:mm")} – {format(endTime, "HH:mm")}
                    <span className="text-gray-400 ml-1.5">
                      ({durationMins < 60 ? `${durationMins}m` : `${durationMins / 60}h`})
                    </span>
                  </p>
                </div>
                {total > 0 && (
                  <p className="text-xl font-bold text-gray-900 flex-shrink-0">{formatCurrency(total, org.currency)}</p>
                )}
              </div>
              {total === 0 && (
                <p className="text-xs text-emerald-600 font-medium">Free — pay on arrival if applicable</p>
              )}
            </div>

            {/* Guest form */}
            <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Your name *</Label>
                  <Input placeholder="Jane Smith" {...register("guestName")} />
                  {errors.guestName && <p className="text-xs text-red-500">{errors.guestName.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Email *</Label>
                  <Input type="email" placeholder="jane@company.com" {...register("guestEmail")} />
                  {errors.guestEmail && <p className="text-xs text-red-500">{errors.guestEmail.message}</p>}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Purpose / notes <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input placeholder="e.g. Client meeting, team workshop…" {...register("purpose")} />
              </div>
              <div className="space-y-1.5">
                <Label>Number of attendees</Label>
                <Input
                  type="number" min={1} max={selectedResource.capacity}
                  className="w-28"
                  {...register("attendees", { valueAsNumber: true })}
                />
                <p className="text-xs text-gray-400">Max capacity: {selectedResource.capacity}</p>
              </div>

              <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Your booking will be sent to {org.name} for confirmation. You&apos;ll hear back by email shortly.
                </p>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-11 text-white font-semibold text-base"
                style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}
              >
                {submitting
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending request…</>
                  : "Request booking"}
              </Button>
            </form>
          </div>
        )}

        {/* ── STEP 4: Success ───────────────────────────────────────────────── */}
        {step === "success" && successData && (
          <div className="text-center space-y-6 py-8">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-gray-900">Booking request sent!</h1>
              <p className="text-gray-500 max-w-sm mx-auto">
                Your request for <strong>{successData.resourceName}</strong> has been received.{" "}
                {org.name} will confirm via email shortly.
              </p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-4 text-left max-w-sm mx-auto space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Details</p>
              <p className="text-sm font-semibold text-gray-900">{successData.resourceName}</p>
              <p className="text-sm text-gray-600">
                {format(new Date(successData.startTime), "EEEE, d MMMM yyyy")}
              </p>
              <p className="text-sm text-gray-600">
                {format(new Date(successData.startTime), "HH:mm")} – {format(new Date(successData.endTime), "HH:mm")}
              </p>
              <Badge className="bg-amber-100 text-amber-800 border-0 text-xs">Pending confirmation</Badge>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setStep("pick-resource");
                setSelectedResource(null);
                setSelectedStart(null);
                setSuccessData(null);
              }}
            >
              Book another space
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
