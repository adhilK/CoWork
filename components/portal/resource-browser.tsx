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
  ChevronLeft,
  ChevronRight,
  Check,
  ImageIcon,
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

export function ResourceBrowser({
  currency,
  initialResources,
}: {
  currency: string;
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
          }))
        );
      })
      .catch(() => toast.error("Failed to load resources"))
      .finally(() => setLoading(false));
  }, [initialResources]);

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
                </div>
              ) : (
                <div
                  className="h-44 w-full flex flex-col items-center justify-center gap-1.5 flex-shrink-0"
                  style={{ background: (RESOURCE_ICON[resource.type as ResourceType] ?? RESOURCE_ICON.OTHER).bg }}
                >
                  <ResourceIcon type={resource.type as ResourceType} size="lg" className="!bg-white/70" />
                  <span className="text-[10px] font-medium" style={{ color: (RESOURCE_ICON[resource.type as ResourceType] ?? RESOURCE_ICON.OTHER).tint }}>
                    No photos yet
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
        <DialogContent className="sm:max-w-md">
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
                  {detailResource.requiresApproval && (
                    <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-600 border-amber-100 flex-shrink-0">
                      Needs approval
                    </Badge>
                  )}
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
                    {detailResource.hourlyRate == null && detailResource.halfDayRate == null && detailResource.fullDayRate == null && (
                      <span className="text-sm text-gray-400">Included with membership</span>
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
