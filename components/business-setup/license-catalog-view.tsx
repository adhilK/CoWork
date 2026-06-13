"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Landmark, Search, Plus, Download, Edit2, Trash2, Loader2, Star, Users, Building2,
  Clock, BadgeCheck, MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import {
  LICENSE_TYPE_LABELS, licenseTypeLabel, UAE_EMIRATES, ACTIVITY_CATEGORIES, type LicenseTypeValue,
} from "@/lib/license-catalog/uae";

type License = {
  id: string;
  jurisdiction: string;
  licenseType: string;
  authority: string;
  emirate: string | null;
  name: string;
  activityCategory: string | null;
  description: string | null;
  baseCost: number | null;
  govFees: number | null;
  visaQuota: number | null;
  officeType: string | null;
  minShareCapital: number | null;
  tenureYears: number;
  processingDays: number | null;
  features: string[];
  isActive: boolean;
  isPopular: boolean;
  templateKey: string | null;
};

type Props = { items: License[]; canManage: boolean; currency: string };

const LICENSE_TYPE_OPTIONS = Object.keys(LICENSE_TYPE_LABELS) as LicenseTypeValue[];
const UAE_TYPES = LICENSE_TYPE_OPTIONS.filter((t) => t.startsWith("UAE_"));

const emptyForm = {
  jurisdiction: "UAE", licenseType: "UAE_FREEZONE", authority: "", emirate: "Dubai", name: "",
  activityCategory: "Commercial", description: "", baseCost: "", govFees: "", visaQuota: "",
  officeType: "Flexi-desk", minShareCapital: "", tenureYears: 1, processingDays: "",
  featuresText: "", isActive: true, isPopular: false,
};

export function LicenseCatalogView({ items, canManage, currency }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [emirateFilter, setEmirateFilter] = useState("ALL");
  const [importing, setImporting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<License | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const filtered = items.filter((i) => {
    if (typeFilter !== "ALL" && i.licenseType !== typeFilter) return false;
    if (emirateFilter !== "ALL" && i.emirate !== emirateFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        i.name.toLowerCase().includes(q) ||
        i.authority.toLowerCase().includes(q) ||
        (i.activityCategory ?? "").toLowerCase().includes(q) ||
        licenseTypeLabel(i.licenseType).toLowerCase().includes(q)
      );
    }
    return true;
  });

  async function importUae() {
    setImporting(true);
    try {
      const res = await fetch("/api/business-setup/licenses/seed", { method: "POST" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const json = await res.json();
      toast.success(`Imported ${json.imported} licenses${json.skipped ? ` (${json.skipped} already present)` : ""}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to import");
    } finally {
      setImporting(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  }

  function openEdit(l: License) {
    setEditing(l);
    setForm({
      jurisdiction: l.jurisdiction, licenseType: l.licenseType, authority: l.authority,
      emirate: l.emirate ?? "", name: l.name, activityCategory: l.activityCategory ?? "",
      description: l.description ?? "", baseCost: l.baseCost?.toString() ?? "",
      govFees: l.govFees?.toString() ?? "", visaQuota: l.visaQuota?.toString() ?? "",
      officeType: l.officeType ?? "", minShareCapital: l.minShareCapital?.toString() ?? "",
      tenureYears: l.tenureYears, processingDays: l.processingDays?.toString() ?? "",
      featuresText: l.features.join("\n"), isActive: l.isActive, isPopular: l.isPopular,
    });
    setDialogOpen(true);
  }

  async function save() {
    if (!form.authority.trim() || !form.name.trim()) { toast.error("Authority and name are required"); return; }
    setSaving(true);
    try {
      const payload: any = {
        authority: form.authority, emirate: form.emirate || null, name: form.name,
        activityCategory: form.activityCategory || null, description: form.description || null,
        baseCost: form.baseCost ? Number(form.baseCost) : null,
        govFees: form.govFees ? Number(form.govFees) : null,
        visaQuota: form.visaQuota !== "" ? Number(form.visaQuota) : null,
        officeType: form.officeType || null,
        minShareCapital: form.minShareCapital ? Number(form.minShareCapital) : null,
        tenureYears: Number(form.tenureYears) || 1,
        processingDays: form.processingDays !== "" ? Number(form.processingDays) : null,
        features: form.featuresText.split("\n").map((s) => s.trim()).filter(Boolean),
        isActive: form.isActive, isPopular: form.isPopular,
      };
      let url = "/api/business-setup/licenses";
      let method = "POST";
      if (editing) { url = `/api/business-setup/licenses/${editing.id}`; method = "PATCH"; }
      else { payload.jurisdiction = form.jurisdiction; payload.licenseType = form.licenseType; }
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success(editing ? "License updated" : "License added");
      setDialogOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(l: License) {
    try {
      const res = await fetch(`/api/business-setup/licenses/${l.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !l.isActive }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch { toast.error("Failed to update"); }
  }

  async function remove(l: License) {
    if (!confirm(`Remove "${l.name}" from your catalog?`)) return;
    try {
      const res = await fetch(`/api/business-setup/licenses/${l.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Removed from catalog");
      router.refresh();
    } catch { toast.error("Failed to remove"); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">License Catalog</h1>
          <p className="page-subtitle">The license & jurisdiction products you offer for company formation</p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <Button variant="outline" className="h-9" onClick={importUae} disabled={importing}>
                {importing ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Download className="w-4 h-4 mr-1.5" />}
                Sync UAE
              </Button>
            )}
            <Button className="h-9 text-white" style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }} onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1.5" /> Add license
            </Button>
          </div>
        )}
      </div>

      {/* Empty state → import CTA */}
      {items.length === 0 ? (
        <div className="dashboard-card p-12 text-center">
          <Landmark className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">Your catalog is empty</p>
          <p className="text-xs text-gray-400 mt-1 mb-4 max-w-md mx-auto">
            Load the built-in UAE catalog — {/* count hint */}freezones, mainland, offshore and branch options — then customise pricing and what you offer.
          </p>
          {canManage ? (
            <Button onClick={importUae} disabled={importing} className="text-white" style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
              {importing ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Download className="w-4 h-4 mr-1.5" />}
              Load UAE catalog
            </Button>
          ) : (
            <p className="text-xs text-gray-400">Ask an admin to load the catalog.</p>
          )}
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input className="pl-8 h-9 text-sm" placeholder="Search authority, name…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "ALL")}>
              <SelectTrigger className="w-[190px] h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All license types</SelectItem>
                {UAE_TYPES.map((t) => <SelectItem key={t} value={t}>{LICENSE_TYPE_LABELS[t]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={emirateFilter} onValueChange={(v) => setEmirateFilter(v ?? "ALL")}>
              <SelectTrigger className="w-[150px] h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All emirates</SelectItem>
                {UAE_EMIRATES.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-xs text-gray-400 ml-auto">{filtered.length} of {items.length}</span>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((l) => (
              <div key={l.id} className={`dashboard-card p-5 flex flex-col gap-3 ${!l.isActive ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-gray-900">{l.authority}</p>
                      {l.isPopular && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">{l.name}</p>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 flex-shrink-0">
                    {l.emirate ?? licenseTypeLabel(l.licenseType)}
                  </span>
                </div>

                {l.baseCost != null && (
                  <div>
                    <span className="text-lg font-bold text-gray-900">{formatCurrency(l.baseCost, currency)}</span>
                    <span className="text-[11px] text-gray-400"> from · {l.tenureYears}yr</span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 text-center">
                  <Stat icon={Users} label="Visas" value={l.visaQuota != null ? String(l.visaQuota) : "—"} />
                  <Stat icon={Building2} label="Office" value={l.officeType ?? "—"} />
                  <Stat icon={Clock} label="Days" value={l.processingDays != null ? `~${l.processingDays}` : "—"} />
                </div>

                <div className="flex items-center gap-2 flex-wrap text-[11px]">
                  <span className="inline-flex items-center gap-1 text-gray-400"><BadgeCheck className="w-3 h-3" />{licenseTypeLabel(l.licenseType)}</span>
                  {l.activityCategory && <span className="text-gray-400">· {l.activityCategory}</span>}
                </div>

                {canManage && (
                  <div className="flex items-center gap-2 pt-1 border-t border-gray-50">
                    <button onClick={() => toggleActive(l)}
                      className={`text-[11px] font-semibold px-2 py-1 rounded-md ${l.isActive ? "text-emerald-600 hover:bg-emerald-50" : "text-gray-400 hover:bg-gray-50"}`}>
                      {l.isActive ? "Active" : "Inactive"}
                    </button>
                    <div className="flex-1" />
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(l)}><Edit2 className="w-3.5 h-3.5" /></Button>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 border-red-100" onClick={() => remove(l)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit license" : "Add license"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2 max-h-[66vh] overflow-y-auto pr-1">
            {!editing && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>License type *</Label>
                  <Select value={form.licenseType} onValueChange={(v) => setForm((f) => ({ ...f, licenseType: v ?? "UAE_FREEZONE" }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LICENSE_TYPE_OPTIONS.map((t) => <SelectItem key={t} value={t}>{LICENSE_TYPE_LABELS[t]}</SelectItem>)}
                    </SelectContent>
                  </Select>
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
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Authority *</Label>
                <Input placeholder="IFZA, DMCC, DET…" value={form.authority} onChange={(e) => setForm((f) => ({ ...f, authority: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Emirate</Label>
                <Select value={form.emirate} onValueChange={(v) => setForm((f) => ({ ...f, emirate: v ?? "" }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {UAE_EMIRATES.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Package name *</Label>
              <Input placeholder="e.g. Commercial License" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Base cost</Label>
                <Input type="number" min={0} value={form.baseCost} onChange={(e) => setForm((f) => ({ ...f, baseCost: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Gov. fees</Label>
                <Input type="number" min={0} value={form.govFees} onChange={(e) => setForm((f) => ({ ...f, govFees: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Visa quota</Label>
                <Input type="number" min={0} value={form.visaQuota} onChange={(e) => setForm((f) => ({ ...f, visaQuota: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Office type</Label>
                <Select value={form.officeType} onValueChange={(v) => setForm((f) => ({ ...f, officeType: v ?? "" }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {["Flexi-desk", "Physical office", "Virtual", "None"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tenure (yrs)</Label>
                <Input type="number" min={1} value={form.tenureYears} onChange={(e) => setForm((f) => ({ ...f, tenureYears: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Processing days</Label>
                <Input type="number" min={0} value={form.processingDays} onChange={(e) => setForm((f) => ({ ...f, processingDays: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Activity category</Label>
                <Select value={form.activityCategory} onValueChange={(v) => setForm((f) => ({ ...f, activityCategory: v ?? "" }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Min. share capital</Label>
                <Input type="number" min={0} value={form.minShareCapital} onChange={(e) => setForm((f) => ({ ...f, minShareCapital: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Features <span className="text-gray-400 font-normal text-[11px]">one per line</span></Label>
              <Textarea rows={3} placeholder={"100% foreign ownership\nNo office required"} value={form.featuresText} onChange={(e) => setForm((f) => ({ ...f, featuresText: e.target.value }))} />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 text-emerald-600" />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.isPopular} onChange={(e) => setForm((f) => ({ ...f, isPopular: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 text-emerald-600" />
                Popular
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="text-white" style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}{editing ? "Save changes" : "Add license"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg py-2">
      <Icon className="w-3.5 h-3.5 text-gray-400 mx-auto" />
      <p className="text-[11px] font-bold text-gray-700 mt-1 truncate px-1">{value}</p>
      <p className="text-[9px] text-gray-400">{label}</p>
    </div>
  );
}
