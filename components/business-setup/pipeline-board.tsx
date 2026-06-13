"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Loader2, TrendingUp, Users, Trophy, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn, formatCurrency } from "@/lib/utils";
import { BsTabs } from "@/components/business-setup/bs-tabs";
import {
  PIPELINE_STAGES, LEAD_STAGE_LABELS, LEAD_STAGE_COLORS, LEAD_PRIORITY_META, LEAD_SOURCES,
  type LeadStageValue,
} from "@/lib/business-setup/meta";
import { LICENSE_TYPE_LABELS, licenseTypeLabel, type LicenseTypeValue } from "@/lib/license-catalog/uae";

type Lead = {
  id: string; clientName: string; companyName: string | null;
  stage: LeadStageValue; priority: string; assignedTo: string | null;
  licenseType: string; source: string | null;
  quotedFee: number | null; estimatedFee: number | null; currency: string;
  activityCount: number; proposalStatus: string | null; updatedAt: string;
};
type Staff = { userId: string; name: string };
type CatalogItem = { id: string; authority: string; name: string; licenseType: string; emirate: string | null; baseCost: number | null; jurisdiction: string };

type Props = { leads: Lead[]; staff: Staff[]; catalog: CatalogItem[]; currency: string; currentUserId: string };

const BOARD_STAGES: LeadStageValue[] = [...PIPELINE_STAGES, "LOST"];
const LICENSE_TYPE_OPTIONS = Object.keys(LICENSE_TYPE_LABELS) as LicenseTypeValue[];

const emptyForm = {
  clientName: "", clientPhone: "", clientEmail: "", clientWhatsapp: "", clientNationality: "",
  companyName: "", jurisdiction: "UAE", licenseType: "UAE_FREEZONE", licenseCatalogId: "",
  priority: "MEDIUM", source: "WhatsApp", estimatedFee: "", assignedTo: "", expectedCloseDate: "", notes: "",
};

export function PipelineBoard({ leads, staff, catalog, currency, currentUserId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm, assignedTo: currentUserId });
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const [localLeads, setLocalLeads] = useState(leads);

  const staffName = (id: string | null) => (id ? staff.find((s) => s.userId === id)?.name ?? "—" : "—");

  const activeValue = localLeads
    .filter((l) => l.stage !== "COMPLETED" && l.stage !== "LOST")
    .reduce((s, l) => s + (l.quotedFee ?? l.estimatedFee ?? 0), 0);
  const wonThisMonth = localLeads.filter((l) => {
    if (l.stage !== "COMPLETED") return false;
    const d = new Date(l.updatedAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  async function move(leadId: string, stage: LeadStageValue) {
    const lead = localLeads.find((l) => l.id === leadId);
    if (!lead || lead.stage === stage) return;
    setLocalLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage } : l)));
    try {
      const res = await fetch(`/api/business-setup/leads/${leadId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setLocalLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage: lead.stage } : l)));
      toast.error("Failed to move lead");
    }
  }

  async function create() {
    if (!form.clientName.trim()) { toast.error("Client name is required"); return; }
    if (!form.clientPhone.trim()) { toast.error("Phone is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/business-setup/leads", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: form.clientName, clientPhone: form.clientPhone,
          clientEmail: form.clientEmail || undefined, clientWhatsapp: form.clientWhatsapp || undefined,
          clientNationality: form.clientNationality || undefined, companyName: form.companyName || undefined,
          jurisdiction: form.jurisdiction, licenseType: form.licenseType,
          licenseCatalogId: form.licenseCatalogId || undefined,
          freezoneName: form.licenseCatalogId ? catalog.find((c) => c.id === form.licenseCatalogId)?.authority : undefined,
          priority: form.priority, source: form.source || undefined,
          estimatedFee: form.estimatedFee ? Number(form.estimatedFee) : undefined,
          assignedTo: form.assignedTo || undefined,
          expectedCloseDate: form.expectedCloseDate || undefined, notes: form.notes || undefined,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success("Lead created");
      setOpen(false);
      setForm({ ...emptyForm, assignedTo: currentUserId });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create lead");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Business Setup</h1>
          <p className="page-subtitle">Lead pipeline for company formation</p>
        </div>
        <Button onClick={() => { setForm({ ...emptyForm, assignedTo: currentUserId }); setOpen(true); }}
          className="text-white" style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
          <Plus className="w-4 h-4 mr-1.5" /> New lead
        </Button>
      </div>

      <BsTabs />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Open leads", value: String(localLeads.filter((l) => l.stage !== "COMPLETED" && l.stage !== "LOST").length), icon: Users, color: "#2563EB", bg: "rgba(37,99,235,0.1)" },
          { label: "Pipeline value", value: formatCurrency(activeValue, currency), icon: TrendingUp, color: "#15803D", bg: "rgba(21,128,61,0.1)" },
          { label: "Won this month", value: String(wonThisMonth), icon: Trophy, color: "#D97706", bg: "rgba(217,119,6,0.1)" },
          { label: "Total leads", value: String(localLeads.length), icon: Users, color: "#7C3AED", bg: "rgba(124,58,237,0.1)" },
        ].map((s) => (
          <div key={s.label} className="dashboard-card p-4">
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

      {/* Board */}
      <div className="overflow-x-auto pb-3 -mx-1 px-1">
        <div className="flex gap-3" style={{ minWidth: "max-content" }}>
          {BOARD_STAGES.map((stage) => {
            const colLeads = localLeads.filter((l) => l.stage === stage);
            const colors = LEAD_STAGE_COLORS[stage];
            const colValue = colLeads.reduce((s, l) => s + (l.quotedFee ?? l.estimatedFee ?? 0), 0);
            return (
              <div key={stage}
                onDragOver={(e) => { e.preventDefault(); setOverStage(stage); }}
                onDragLeave={() => setOverStage((s) => (s === stage ? null : s))}
                onDrop={(e) => { e.preventDefault(); if (dragId) move(dragId, stage); setDragId(null); setOverStage(null); }}
                className={cn("w-[260px] flex-shrink-0 rounded-2xl p-2 transition-colors",
                  overStage === stage ? "bg-emerald-50" : "bg-gray-50/70")}>
                <div className="flex items-center gap-2 px-2 py-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: colors.dot }} />
                  <p className="text-xs font-semibold text-gray-700">{LEAD_STAGE_LABELS[stage]}</p>
                  <span className="text-[10px] font-bold text-gray-400">{colLeads.length}</span>
                  {colValue > 0 && <span className="text-[10px] text-gray-400 ml-auto">{formatCurrency(colValue, currency)}</span>}
                </div>

                <div className="space-y-2 min-h-[60px]">
                  {colLeads.map((l) => {
                    const pri = LEAD_PRIORITY_META[l.priority as keyof typeof LEAD_PRIORITY_META] ?? LEAD_PRIORITY_META.MEDIUM;
                    return (
                      <div key={l.id} draggable
                        onDragStart={() => setDragId(l.id)}
                        onDragEnd={() => { setDragId(null); setOverStage(null); }}
                        className={cn("group bg-white rounded-xl border border-gray-100 p-3 shadow-sm cursor-grab active:cursor-grabbing",
                          dragId === l.id && "opacity-50")}>
                        <Link href={`/dashboard/business-setup/leads/${l.id}`} className="block">
                          <div className="flex items-start gap-1.5">
                            <GripVertical className="w-3.5 h-3.5 text-gray-200 group-hover:text-gray-300 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{l.clientName}</p>
                              {l.companyName && <p className="text-[11px] text-gray-400 truncate">{l.companyName}</p>}
                            </div>
                            <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0", pri.bg, pri.text)}>{pri.label}</span>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1.5">{licenseTypeLabel(l.licenseType)}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs font-bold text-gray-700">
                              {l.quotedFee != null || l.estimatedFee != null ? formatCurrency(l.quotedFee ?? l.estimatedFee ?? 0, l.currency) : "—"}
                            </span>
                            <span className="text-[10px] text-gray-400">{staffName(l.assignedTo)}</span>
                          </div>
                          {l.proposalStatus && (
                            <span className="inline-block mt-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-purple-50 text-purple-600">
                              Proposal: {l.proposalStatus}
                            </span>
                          )}
                        </Link>
                      </div>
                    );
                  })}
                  {colLeads.length === 0 && <div className="text-center text-[11px] text-gray-300 py-4">Drop here</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* New lead dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>New lead</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2 max-h-[66vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Client name *</Label>
                <Input value={form.clientName} onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Company</Label>
                <Input value={form.companyName} onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone *</Label>
                <Input placeholder="+971 50 000 0000" value={form.clientPhone} onChange={(e) => setForm((f) => ({ ...f, clientPhone: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>WhatsApp</Label>
                <Input placeholder="defaults to phone" value={form.clientWhatsapp} onChange={(e) => setForm((f) => ({ ...f, clientWhatsapp: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.clientEmail} onChange={(e) => setForm((f) => ({ ...f, clientEmail: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Nationality</Label>
                <Input value={form.clientNationality} onChange={(e) => setForm((f) => ({ ...f, clientNationality: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Jurisdiction</Label>
                <Select value={form.jurisdiction} onValueChange={(v) => setForm((f) => ({ ...f, jurisdiction: v ?? "UAE" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="UAE">UAE</SelectItem><SelectItem value="KSA">KSA</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>License type *</Label>
                <Select value={form.licenseType} onValueChange={(v) => setForm((f) => ({ ...f, licenseType: v ?? "UAE_FREEZONE" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LICENSE_TYPE_OPTIONS.map((t) => <SelectItem key={t} value={t}>{LICENSE_TYPE_LABELS[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {catalog.length > 0 && (
              <div className="space-y-1.5">
                <Label>License product <span className="text-gray-400 font-normal text-[11px]">from your catalog</span></Label>
                <Select value={form.licenseCatalogId} onValueChange={(v) => {
                  const c = catalog.find((x) => x.id === v);
                  setForm((f) => ({ ...f, licenseCatalogId: v ?? "", licenseType: c?.licenseType ?? f.licenseType, estimatedFee: c?.baseCost != null ? String(c.baseCost) : f.estimatedFee }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Optional — link a product" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {catalog.map((c) => <SelectItem key={c.id} value={c.id}>{c.authority} — {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v ?? "MEDIUM" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(LEAD_PRIORITY_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Source</Label>
                <Select value={form.source} onValueChange={(v) => setForm((f) => ({ ...f, source: v ?? "" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Est. fee</Label>
                <Input type="number" min={0} value={form.estimatedFee} onChange={(e) => setForm((f) => ({ ...f, estimatedFee: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Assign to</Label>
                <Select value={form.assignedTo} onValueChange={(v) => setForm((f) => ({ ...f, assignedTo: v ?? "" }))}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {staff.map((s) => <SelectItem key={s.userId} value={s.userId}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Expected close</Label>
                <Input type="date" value={form.expectedCloseDate} onChange={(e) => setForm((f) => ({ ...f, expectedCloseDate: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create} disabled={saving} className="text-white" style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Create lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
