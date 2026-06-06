"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Calendar,
  Users,
  Search,
  Filter,
  Clock,
  MapPin,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency, humanizeEnum } from "@/lib/utils";

type Resource = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  capacity: number;
  hourlyRate: number | null;
  halfDayRate: number | null;
  fullDayRate: number | null;
  amenities: string[];
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

export function ResourceBrowser({ currency }: { currency: string }) {
  const router = useRouter();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [form, setForm] = useState<BookingFormState>({
    date: todayString(),
    startTime: "09:00",
    endTime: "10:00",
    title: "",
    attendees: 1,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
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
          }))
        );
      })
      .catch(() => toast.error("Failed to load resources"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = resources
    .filter((r) => r.isActive)
    .filter(
      (r) =>
        typeFilter === "ALL" || r.type === typeFilter
    )
    .filter(
      (r) =>
        !search ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.location?.name.toLowerCase().includes(search.toLowerCase())
    );

  const types = Array.from(new Set(resources.map((r) => r.type))).sort(
    (a, b) => RESOURCE_TYPE_ORDER.indexOf(a) - RESOURCE_TYPE_ORDER.indexOf(b)
  );

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
    if ((end.getTime() - start.getTime()) < 30 * 60 * 1000) {
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
      toast.success(
        selectedResource.requiresApproval
          ? "Booking request submitted — awaiting approval"
          : "Booking confirmed!"
      );
      setSelectedResource(null);
      router.push("/portal/my-bookings");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Book a space</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Browse available desks, rooms, and offices.
        </p>
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
              {RESOURCE_EMOJI[t]} {humanizeEnum(t)}
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
          <p className="text-2xl mb-2">🔍</p>
          <p className="text-gray-500 font-medium text-sm">No spaces found</p>
          <p className="text-gray-400 text-xs mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((resource) => (
            <div
              key={resource.id}
              className="dashboard-card p-5 flex flex-col hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl leading-none flex-shrink-0">
                  {RESOURCE_EMOJI[resource.type] ?? "📌"}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                    {resource.name}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {humanizeEnum(resource.type)}
                  </p>
                </div>
                {resource.requiresApproval && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-amber-50 text-amber-600 border-amber-100 flex-shrink-0"
                  >
                    Approval
                  </Badge>
                )}
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

              <Button
                className="mt-auto w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                onClick={() => setSelectedResource(resource)}
              >
                <Calendar className="w-3.5 h-3.5 mr-2" />
                Book now
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Booking dialog */}
      <Dialog
        open={!!selectedResource}
        onOpenChange={(open) => !open && setSelectedResource(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{RESOURCE_EMOJI[selectedResource?.type ?? "OTHER"]}</span>
              <span>Book {selectedResource?.name}</span>
            </DialogTitle>
          </DialogHeader>

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

            {selectedResource?.requiresApproval && (
              <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-xs text-amber-700">
                This space requires admin approval. Your booking will show as "Pending" until approved.
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
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
    </div>
  );
}
