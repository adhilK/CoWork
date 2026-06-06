"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Building2, Users, Clock, MoreVertical, Edit, Trash2, ChevronRight, Search, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatCurrency, humanizeEnum, cn } from "@/lib/utils";
import { ResourceIcon } from "@/components/shared/resource-icon";
import { format, isToday, isTomorrow, differenceInDays } from "date-fns";
import { toast } from "sonner";
import type { ResourceType } from "@prisma/client";

type Resource = {
  id: string; name: string; type: ResourceType; capacity: number;
  isActive: boolean; hourlyRate: any; halfDayRate: any; fullDayRate: any;
  amenities: string[]; description: string | null;
  location: { name: string };
};

type Location = { id: string; name: string };

type AvailabilityEntry = {
  currentBookingEnd: Date | null;
  nextBookingStart: Date | null;
  nextBookingEnd: Date | null;
  bookedUntil: Date | null;
};

type Props = {
  resources: Resource[];
  locations: Location[];
  currency: string;
  organizationId: string;
  availabilityMap?: Record<string, AvailabilityEntry>;
};

function fmtDate(d: Date): string {
  if (isToday(d)) return format(d, "HH:mm") + " today";
  if (isTomorrow(d)) return format(d, "HH:mm") + " tomorrow";
  const days = differenceInDays(d, new Date());
  if (days < 7) return format(d, "EEE HH:mm");
  return format(d, "d MMM, HH:mm");
}

export function ResourcesView({ resources, locations, currency, organizationId, availabilityMap = {} }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(resources);
  const [filter, setFilter] = useState<"all" | "available" | "occupied">("all");
  const [search, setSearch] = useState("");

  async function toggleActive(id: string, current: boolean) {
    try {
      await fetch(`/api/resources/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current }),
      });
      setItems((prev) => prev.map((r) => r.id === id ? { ...r, isActive: !current } : r));
      toast.success(`Resource ${!current ? "enabled" : "disabled"}`);
    } catch { toast.error("Failed to update resource"); }
  }

  async function deleteResource(id: string) {
    if (!confirm("Delete this resource?")) return;
    try {
      await fetch(`/api/resources/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((r) => r.id !== id));
      toast.success("Resource deleted");
    } catch { toast.error("Failed to delete resource"); }
  }

  const activeItems = items.filter((r) => r.isActive);
  const availableCount = activeItems.filter((r) => !availabilityMap[r.id]?.currentBookingEnd).length;
  const occupiedCount = activeItems.filter((r) => !!availabilityMap[r.id]?.currentBookingEnd).length;

  const q = search.trim().toLowerCase();
  const displayed = items.filter((r) => {
    if (q && !(`${r.name} ${humanizeEnum(r.type)} ${r.location.name}`.toLowerCase().includes(q))) return false;
    if (filter === "available") return r.isActive && !availabilityMap[r.id]?.currentBookingEnd;
    if (filter === "occupied") return r.isActive && !!availabilityMap[r.id]?.currentBookingEnd;
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Resources</h1>
          <p className="page-subtitle">Desks, rooms and offices you can book</p>
        </div>
        <Button
          onClick={() => router.push("/dashboard/resources/new")}
          className="h-9 font-semibold text-white"
          style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}
        >
          <Plus className="w-4 h-4 mr-1.5" /> Add resource
        </Button>
      </div>

      {/* Live summary bar */}
      {activeItems.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {([
            { key: "all", value: activeItems.length, label: "Total active", color: "#0F172A", icon: Building2, ring: "border-gray-900", bg: "#F1F5F9" },
            { key: "available", value: availableCount, label: "Available now", color: "#16A34A", icon: CheckCircle2, ring: "border-emerald-500", bg: "#DCFCE7" },
            { key: "occupied", value: occupiedCount, label: "In use now", color: "#EF4444", icon: Clock, ring: "border-red-400", bg: "#FEE2E2" },
          ] as const).map((s) => (
            <button key={s.key} onClick={() => setFilter(s.key)}
              className={cn("dashboard-card p-4 flex items-center gap-3 text-left transition-all border-2",
                filter === s.key ? s.ring : "border-transparent")}>
              <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.bg }}>
                <s.icon style={{ color: s.color, width: 18, height: 18 }} />
              </span>
              <div>
                <p className="text-2xl font-bold leading-none" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs text-gray-400 mt-1">{s.label}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      {items.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search resources…" className="pl-9 h-10 bg-white"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      )}

      {items.length === 0 ? (
        <div className="dashboard-card p-12 text-center">
          <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No resources yet</p>
          <p className="text-sm text-gray-400 mt-1">Add desks, meeting rooms, and offices to get started.</p>
          <Button className="mt-4 text-white" style={{ background: "#22C55E" }}
            onClick={() => router.push("/dashboard/resources/new")}>
            Add first resource
          </Button>
        </div>
      ) : displayed.length === 0 ? (
        <div className="dashboard-card p-12 text-center text-gray-400">
          <Search className="w-9 h-9 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-500">No resources match your filter</p>
          <button className="text-xs text-emerald-600 hover:underline mt-1"
            onClick={() => { setSearch(""); setFilter("all"); }}>Clear filters</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayed.map((r) => {
            const avail = availabilityMap[r.id];
            const isOccupied = r.isActive && !!avail?.currentBookingEnd;
            const isAvailable = r.isActive && !isOccupied;
            const nextStart = avail?.nextBookingStart ? new Date(avail.nextBookingStart) : null;
            const currentEnd = avail?.currentBookingEnd ? new Date(avail.currentBookingEnd) : null;
            const bookedUntil = avail?.bookedUntil ? new Date(avail.bookedUntil) : null;
            const daysBooked = bookedUntil ? differenceInDays(bookedUntil, new Date()) : 0;

            return (
              <div
                key={r.id}
                onClick={() => router.push(`/dashboard/resources/${r.id}`)}
                className={cn(
                  "dashboard-card group flex flex-col overflow-hidden transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5",
                  !r.isActive && "opacity-50"
                )}
              >
                {/* Status strip — top accent bar */}
                <div className={cn(
                  "h-1.5 w-full",
                  !r.isActive ? "bg-gray-200" :
                  isOccupied ? "bg-red-400" : "bg-emerald-400"
                )} />

                <div className="p-5 flex flex-col gap-4 flex-1">
                  {/* Top row: icon + name + menu */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <ResourceIcon type={r.type} size="md" />
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate leading-tight">{r.name}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {humanizeEnum(r.type)} · {r.location.name}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger onClick={(e) => e.stopPropagation()} className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors">
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/resources/${r.id}/edit`); }}>
                          <Edit className="w-3.5 h-3.5 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toggleActive(r.id, r.isActive); }}>
                          {r.isActive ? "Disable" : "Enable"}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); deleteResource(r.id); }}>
                          <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Status block */}
                  {r.isActive && (
                    <div className={cn(
                      "rounded-xl px-4 py-3",
                      isOccupied ? "bg-red-50" : "bg-emerald-50"
                    )}>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "w-2 h-2 rounded-full flex-shrink-0",
                          isOccupied ? "bg-red-500 animate-pulse" : "bg-emerald-500"
                        )} />
                        <span className={cn(
                          "font-semibold text-sm",
                          isOccupied ? "text-red-700" : "text-emerald-700"
                        )}>
                          {isOccupied ? `In use until ${format(currentEnd!, "HH:mm")}` : "Available now"}
                        </span>
                      </div>
                      {/* Secondary line */}
                      {isOccupied && nextStart && (
                        <p className="text-xs text-red-500 mt-1 ml-4">
                          Next free: {fmtDate(nextStart)}
                        </p>
                      )}
                      {isAvailable && nextStart && (
                        <p className="text-xs text-emerald-600 mt-1 ml-4">
                          Next booking: {fmtDate(nextStart)}
                        </p>
                      )}
                      {isAvailable && !nextStart && (
                        <p className="text-xs text-emerald-500 mt-1 ml-4">No upcoming bookings</p>
                      )}
                    </div>
                  )}

                  {!r.isActive && (
                    <div className="rounded-xl px-4 py-3 bg-gray-50">
                      <span className="text-sm font-medium text-gray-400">Disabled</span>
                    </div>
                  )}

                  {/* Compact metadata */}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {r.capacity} {r.capacity === 1 ? "person" : "people"}
                    </span>
                    {r.hourlyRate && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatCurrency(Number(r.hourlyRate), currency)}/hr
                      </span>
                    )}
                    {daysBooked > 0 && (
                      <span className="ml-auto text-gray-400 font-medium">
                        {daysBooked}d booked ahead
                      </span>
                    )}
                  </div>

                  {/* Amenities */}
                  {r.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {r.amenities.slice(0, 3).map((a) => (
                        <span key={a} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{a}</span>
                      ))}
                      {r.amenities.length > 3 && (
                        <span className="text-xs text-gray-400 px-1">+{r.amenities.length - 3}</span>
                      )}
                    </div>
                  )}

                  {/* View-details cue — the whole card is clickable */}
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-auto self-end group-hover:text-emerald-600 transition-colors">
                    View details <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
