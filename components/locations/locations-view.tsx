"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MapPin, Plus, Building2, Edit2, Trash2, Loader2, Users, Calendar, TrendingUp,
  Wifi, Clock, ShieldCheck, ChevronRight, X, Globe, KeyRound, Eye, EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatCurrency, humanizeEnum } from "@/lib/utils";

type Manager = { id: string; name: string | null; email: string };

type OpeningHours = Record<string, { open?: string; close?: string; closed?: boolean }>;

type Location = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  jurisdiction: string;
  timezone: string | null;
  phone: string | null;
  email: string | null;
  vatNumber: string | null;
  managerUserId: string | null;
  managerName: string | null;
  openingHours: OpeningHours | null;
  accessInstructions: string | null;
  wifiName: string | null;
  hasWifiPassword: boolean;
  floorPlanUrl: string | null;
  parentLocationId: string | null;
  isActive: boolean;
  resourceCount: number;
  bookingsThisMonth: number;
  revenueThisMonth: number;
};

type Props = {
  locations: Location[];
  managers: Manager[];
  currency: string;
  allowCrossLocationBooking: boolean;
};

const DAYS: { key: string; label: string }[] = [
  { key: "mon", label: "Mon" }, { key: "tue", label: "Tue" }, { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" }, { key: "fri", label: "Fri" }, { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

const TIMEZONES = ["Asia/Dubai", "Asia/Riyadh", "Asia/Bahrain", "Asia/Qatar", "Asia/Kuwait", "Asia/Muscat"];

function defaultHours(): OpeningHours {
  const h: OpeningHours = {};
  for (const d of DAYS) h[d.key] = { open: "09:00", close: "18:00", closed: d.key === "sun" };
  return h;
}

const emptyForm = {
  name: "", address: "", city: "", country: "", jurisdiction: "UAE", timezone: "Asia/Dubai",
  phone: "", email: "", vatNumber: "", managerUserId: "", accessInstructions: "",
  wifiName: "", wifiPassword: "", floorPlanUrl: "", parentLocationId: "", isActive: true,
  openingHours: defaultHours(),
};

export function LocationsView({ locations, managers, currency, allowCrossLocationBooking }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [showPwd, setShowPwd] = useState(false);
  const [crossBooking, setCrossBooking] = useState(allowCrossLocationBooking);
  const [togglingCross, setTogglingCross] = useState(false);
  const [detail, setDetail] = useState<Location | null>(null);

  const totalResources = locations.reduce((s, l) => s + l.resourceCount, 0);
  const totalRevenue = locations.reduce((s, l) => s + l.revenueThisMonth, 0);

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, openingHours: defaultHours() });
    setShowPwd(false);
    setDialogOpen(true);
  }

  async function openEdit(loc: Location) {
    setEditingId(loc.id);
    setShowPwd(false);
    // Fetch single location to get the decrypted wifi password.
    let wifiPassword = "";
    try {
      const res = await fetch(`/api/locations/${loc.id}`);
      if (res.ok) {
        const json = await res.json();
        wifiPassword = json.wifiPassword ?? "";
      }
    } catch { /* non-fatal */ }
    setForm({
      name: loc.name,
      address: loc.address ?? "",
      city: loc.city ?? "",
      country: loc.country ?? "",
      jurisdiction: loc.jurisdiction,
      timezone: loc.timezone ?? "Asia/Dubai",
      phone: loc.phone ?? "",
      email: loc.email ?? "",
      vatNumber: loc.vatNumber ?? "",
      managerUserId: loc.managerUserId ?? "",
      accessInstructions: loc.accessInstructions ?? "",
      wifiName: loc.wifiName ?? "",
      wifiPassword,
      floorPlanUrl: loc.floorPlanUrl ?? "",
      parentLocationId: loc.parentLocationId ?? "",
      isActive: loc.isActive,
      openingHours: loc.openingHours ?? defaultHours(),
    });
    setDialogOpen(true);
  }

  async function save() {
    if (!form.name.trim()) { toast.error("Location name is required"); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        address: form.address || null,
        city: form.city || null,
        country: form.country || null,
        jurisdiction: form.jurisdiction,
        timezone: form.timezone || null,
        phone: form.phone || null,
        email: form.email || null,
        vatNumber: form.vatNumber || null,
        managerUserId: form.managerUserId || null,
        accessInstructions: form.accessInstructions || null,
        wifiName: form.wifiName || null,
        wifiPassword: form.wifiPassword || null,
        floorPlanUrl: form.floorPlanUrl || null,
        parentLocationId: form.parentLocationId || null,
        isActive: form.isActive,
        openingHours: form.openingHours,
      };
      const url = editingId ? `/api/locations/${editingId}` : "/api/locations";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success(editingId ? "Location updated" : "Location created");
      setDialogOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save location");
    } finally {
      setSaving(false);
    }
  }

  async function remove(loc: Location) {
    if (!confirm(`Delete "${loc.name}"? This can't be undone.`)) return;
    try {
      const res = await fetch(`/api/locations/${loc.id}`, { method: "DELETE" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success("Location removed");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove location");
    }
  }

  async function toggleCrossBooking(next: boolean) {
    setCrossBooking(next);
    setTogglingCross(true);
    try {
      const res = await fetch("/api/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowCrossLocationBooking: next }),
      });
      if (!res.ok) throw new Error();
      toast.success(next ? "Members can book at any location" : "Members are restricted to their home location");
    } catch {
      setCrossBooking(!next);
      toast.error("Failed to update setting");
    } finally {
      setTogglingCross(false);
    }
  }

  function setDay(key: string, patch: Partial<{ open: string; close: string; closed: boolean }>) {
    setForm((f) => ({ ...f, openingHours: { ...f.openingHours, [key]: { ...f.openingHours[key], ...patch } } }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Locations</h1>
          <p className="page-subtitle">Manage your branches, their resources, and local settings</p>
        </div>
        <Button onClick={openCreate} className="text-white" style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
          <Plus className="w-4 h-4 mr-1.5" /> Add location
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Locations", value: String(locations.length), icon: MapPin, color: "#15803D", bg: "rgba(21,128,61,0.1)" },
          { label: "Total resources", value: String(totalResources), icon: Building2, color: "#2563EB", bg: "rgba(37,99,235,0.1)" },
          { label: "Bookings (mo)", value: String(locations.reduce((s, l) => s + l.bookingsThisMonth, 0)), icon: Calendar, color: "#7C3AED", bg: "rgba(124,58,237,0.1)" },
          { label: "Revenue (mo)", value: formatCurrency(totalRevenue, currency), icon: TrendingUp, color: "#D97706", bg: "rgba(217,119,6,0.1)" },
        ].map((s) => (
          <div key={s.label} className="dashboard-card p-5">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{s.label}</p>
                <p className="text-xl font-bold text-gray-900 mt-1 truncate">{s.value}</p>
              </div>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.bg }}>
                <s.icon style={{ width: 18, height: 18, color: s.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cross-location booking toggle */}
      <div className="dashboard-card p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(37,99,235,0.1)" }}>
          <Globe style={{ width: 18, height: 18, color: "#2563EB" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">Cross-location booking</p>
          <p className="text-xs text-gray-500">Allow members to book resources at any of your locations, not just their home branch.</p>
        </div>
        <button
          role="switch"
          aria-checked={crossBooking}
          disabled={togglingCross}
          onClick={() => toggleCrossBooking(!crossBooking)}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${crossBooking ? "bg-emerald-500" : "bg-gray-300"} disabled:opacity-60`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${crossBooking ? "translate-x-5" : ""}`} />
        </button>
      </div>

      {/* Location cards */}
      {locations.length === 0 ? (
        <div className="dashboard-card p-12 text-center">
          <MapPin className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">No locations yet</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">Add your first branch to start assigning resources</p>
          <Button onClick={openCreate} variant="outline">Add location</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {locations.map((l) => (
            <div key={l.id} className="dashboard-card p-5 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(21,128,61,0.1)" }}>
                  <Building2 style={{ width: 20, height: 20, color: "#15803D" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">{l.name}</p>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{l.jurisdiction}</span>
                    {l.parentLocationId && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-50 text-purple-600">Sub-branch</span>}
                    {!l.isActive && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">Inactive</span>}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                    {[l.address, l.city, l.country].filter(Boolean).join(", ") || "No address set"}
                  </p>
                  {l.managerName && (
                    <p className="text-[11px] text-gray-400 mt-0.5">Manager: {l.managerName}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Resources", value: String(l.resourceCount) },
                  { label: "Bookings (mo)", value: String(l.bookingsThisMonth) },
                  { label: "Revenue (mo)", value: formatCurrency(l.revenueThisMonth, currency) },
                ].map((it) => (
                  <div key={it.label} className="bg-gray-50 rounded-lg py-2">
                    <p className="text-[10px] text-gray-400 font-medium">{it.label}</p>
                    <p className="text-xs font-bold text-gray-700 mt-0.5 truncate px-1">{it.value}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 text-[11px] text-gray-400 flex-wrap">
                {l.wifiName && <span className="inline-flex items-center gap-1"><Wifi className="w-3 h-3" /> {l.wifiName}</span>}
                {l.openingHours && <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> Hours set</span>}
                {l.vatNumber && <span className="inline-flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> VAT {l.vatNumber}</span>}
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-gray-50">
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setDetail(l)}>
                  Details <ChevronRight className="w-3 h-3 ml-0.5" />
                </Button>
                <Link href={`/dashboard/resources?location=${l.id}`}>
                  <Button variant="outline" size="sm" className="h-8 text-xs">View resources</Button>
                </Link>
                <div className="flex-1" />
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(l)}>
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 border-red-100" onClick={() => remove(l)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="sm:max-w-lg">
          {detail && (
            <>
              <DialogHeader><DialogTitle>{detail.name}</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2 max-h-[65vh] overflow-y-auto text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <Info label="Jurisdiction" value={detail.jurisdiction} />
                  <Info label="Status" value={detail.isActive ? "Active" : "Inactive"} />
                  <Info label="Address" value={[detail.address, detail.city, detail.country].filter(Boolean).join(", ") || "—"} full />
                  <Info label="Phone" value={detail.phone ?? "—"} />
                  <Info label="Email" value={detail.email ?? "—"} />
                  <Info label="Timezone" value={detail.timezone ?? "—"} />
                  <Info label="VAT number" value={detail.vatNumber ?? "—"} />
                  <Info label="Manager" value={detail.managerName ?? "—"} />
                  <Info label="Wi-Fi network" value={detail.wifiName ?? "—"} />
                </div>

                {detail.openingHours && (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase mb-1.5">Opening hours</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {DAYS.map((d) => {
                        const h = detail.openingHours?.[d.key];
                        return (
                          <div key={d.key} className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">{d.label}</span>
                            <span className="text-gray-700 font-medium">
                              {h?.closed ? "Closed" : `${h?.open ?? "—"} – ${h?.close ?? "—"}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {detail.accessInstructions && (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase mb-1">Access instructions</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{detail.accessInstructions}</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDetail(null)}>Close</Button>
                <Button className="text-white" style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}
                  onClick={() => { const d = detail; setDetail(null); openEdit(d); }}>
                  <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editingId ? "Edit location" : "Add location"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2 max-h-[68vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="col-span-full space-y-1.5">
                <Label>Name *</Label>
                <Input placeholder="e.g. Business Bay Branch" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="col-span-full space-y-1.5">
                <Label>Address</Label>
                <Input placeholder="Building, street" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Country</Label>
                <Input value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Jurisdiction</Label>
                <Select value={form.jurisdiction} onValueChange={(v) => setForm((f) => ({ ...f, jurisdiction: v ?? "UAE" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UAE">UAE</SelectItem>
                    <SelectItem value="KSA">KSA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Timezone</Label>
                <Select value={form.timezone} onValueChange={(v) => setForm((f) => ({ ...f, timezone: v ?? "Asia/Dubai" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>VAT number <span className="text-gray-400 font-normal text-[11px]">KSA: per-branch</span></Label>
                <Input value={form.vatNumber} onChange={(e) => setForm((f) => ({ ...f, vatNumber: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Manager</Label>
                <Select value={form.managerUserId} onValueChange={(v) => setForm((f) => ({ ...f, managerUserId: v ?? "" }))}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {managers.map((m) => <SelectItem key={m.id} value={m.id}>{m.name ?? m.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {locations.length > 0 && (
                <div className="col-span-full space-y-1.5">
                  <Label>Parent location <span className="text-gray-400 font-normal text-[11px]">franchise sub-branch</span></Label>
                  <Select value={form.parentLocationId} onValueChange={(v) => setForm((f) => ({ ...f, parentLocationId: v ?? "" }))}>
                    <SelectTrigger><SelectValue placeholder="None (top-level)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None (top-level)</SelectItem>
                      {locations.filter((l) => l.id !== editingId).map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Opening hours */}
            <div className="space-y-2">
              <Label>Opening hours</Label>
              <div className="space-y-1.5 bg-gray-50 rounded-xl p-3">
                {DAYS.map((d) => {
                  const h = form.openingHours[d.key] ?? {};
                  return (
                    <div key={d.key} className="flex items-center gap-2">
                      <span className="w-10 text-xs font-medium text-gray-500">{d.label}</span>
                      <Input type="time" className="h-8 text-xs flex-1" value={h.open ?? "09:00"} disabled={h.closed}
                        onChange={(e) => setDay(d.key, { open: e.target.value })} />
                      <span className="text-gray-300 text-xs">–</span>
                      <Input type="time" className="h-8 text-xs flex-1" value={h.close ?? "18:00"} disabled={h.closed}
                        onChange={(e) => setDay(d.key, { close: e.target.value })} />
                      <label className="flex items-center gap-1 text-[11px] text-gray-500 w-16">
                        <input type="checkbox" checked={!!h.closed} onChange={(e) => setDay(d.key, { closed: e.target.checked })}
                          className="w-3.5 h-3.5 rounded border-gray-300 text-emerald-600" />
                        Closed
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Member-facing info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Wifi className="w-3.5 h-3.5" /> Wi-Fi network</Label>
                <Input value={form.wifiName} onChange={(e) => setForm((f) => ({ ...f, wifiName: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><KeyRound className="w-3.5 h-3.5" /> Wi-Fi password <span className="text-gray-400 font-normal text-[11px]">encrypted</span></Label>
                <div className="relative">
                  <Input type={showPwd ? "text" : "password"} value={form.wifiPassword}
                    onChange={(e) => setForm((f) => ({ ...f, wifiPassword: e.target.value }))} />
                  <button type="button" onClick={() => setShowPwd((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Access instructions <span className="text-gray-400 font-normal text-[11px]">shown to members</span></Label>
              <Textarea rows={2} placeholder="e.g. Take lift to 4th floor, reception on the right." value={form.accessInstructions}
                onChange={(e) => setForm((f) => ({ ...f, accessInstructions: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Floor plan URL</Label>
              <Input placeholder="https://..." value={form.floorPlanUrl} onChange={(e) => setForm((f) => ({ ...f, floorPlanUrl: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="locActive" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-emerald-600" />
              <Label htmlFor="locActive" className="cursor-pointer">Active (bookable)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="text-white" style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {editingId ? "Save changes" : "Add location"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <p className="text-[11px] font-semibold text-gray-400 uppercase">{label}</p>
      <p className="text-sm text-gray-800 mt-0.5 break-words">{value}</p>
    </div>
  );
}
