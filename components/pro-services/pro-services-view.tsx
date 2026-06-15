"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Search, Loader2, FileCheck2, AlertTriangle, Clock, CheckCircle2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import {
  SERVICE_TYPE_GROUPS, SERVICE_TYPE_LABELS, serviceTypeLabel, PRO_STAGES, OPEN_STAGES,
  PRO_STAGE_LABELS, PRO_STAGE_META, URGENCIES, URGENCY_META, GOVERNING_BODIES, slaStatus,
} from "@/lib/pro-services/meta";

type Req = {
  id: string; memberName: string; serviceType: string; jurisdiction: string;
  stage: string; urgency: string; governingBody: string | null; referenceNumber: string | null;
  assignedTo: string | null; fee: number | null; currency: string; dueDate: string | null; createdAt: string;
};
type Member = { id: string; name: string };
type Staff = { userId: string; name: string };

type Props = {
  requests: Req[]; members: Member[]; staff: Staff[]; staffMap: Record<string, string>;
  currency: string; currentUserId: string;
};

const SLA_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  overdue: { bg: "bg-red-50", text: "text-red-600", label: "Overdue" },
  soon: { bg: "bg-amber-50", text: "text-amber-700", label: "Due soon" },
  ok: { bg: "bg-green-50", text: "text-green-700", label: "On track" },
  none: { bg: "bg-gray-100", text: "text-gray-400", label: "—" },
};

const emptyForm = {
  memberId: "", serviceType: "UAE_VISA_NEW", jurisdiction: "UAE", urgency: "STANDARD",
  governingBody: "", referenceNumber: "", fee: "", slaDays: "", dueDate: "", assignedTo: "",
  serviceDescription: "", clientNotes: "", internalNotes: "",
};

export function ProServicesView({ requests, members, staff, staffMap, currency, currentUserId }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("OPEN");
  const [urgencyFilter, setUrgencyFilter] = useState("ALL");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm, assignedTo: currentUserId });
  const [saving, setSaving] = useState(false);

  const now = Date.now();
  const overdueCount = requests.filter((r) => slaStatus(r.dueDate, r.stage) === "overdue").length;
  const dueSoonCount = requests.filter((r) => slaStatus(r.dueDate, r.stage) === "soon").length;
  const openCount = requests.filter((r) => r.stage !== "COMPLETED" && r.stage !== "CANCELLED").length;
  const doneThisMonth = requests.filter((r) => {
    if (r.stage !== "COMPLETED") return false;
    const d = new Date(r.createdAt);
    return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
  }).length;

  const filtered = requests.filter((r) => {
    if (stageFilter === "OPEN" && (r.stage === "COMPLETED" || r.stage === "CANCELLED")) return false;
    if (stageFilter !== "OPEN" && stageFilter !== "ALL" && r.stage !== stageFilter) return false;
    if (urgencyFilter !== "ALL" && r.urgency !== urgencyFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.memberName.toLowerCase().includes(q) ||
        serviceTypeLabel(r.serviceType).toLowerCase().includes(q) ||
        (r.referenceNumber ?? "").toLowerCase().includes(q) ||
        (r.governingBody ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  async function create() {
    if (!form.memberId) { toast.error("Select a member"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/pro-services", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: form.memberId, serviceType: form.serviceType, jurisdiction: form.jurisdiction,
          urgency: form.urgency, governingBody: form.governingBody || undefined,
          referenceNumber: form.referenceNumber || undefined, fee: form.fee ? Number(form.fee) : undefined,
          slaDays: form.slaDays !== "" ? Number(form.slaDays) : undefined, dueDate: form.dueDate || undefined,
          assignedTo: form.assignedTo || undefined, serviceDescription: form.serviceDescription || undefined,
          clientNotes: form.clientNotes || undefined, internalNotes: form.internalNotes || undefined,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success("Request created");
      setOpen(false);
      setForm({ ...emptyForm, assignedTo: currentUserId });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">PRO Services</h1>
          <p className="page-subtitle">Government-liaison requests and SLA tracking</p>
        </div>
        <Button onClick={() => { setForm({ ...emptyForm, assignedTo: currentUserId }); setOpen(true); }}
          className="text-white" style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
          <Plus className="w-4 h-4 mr-1.5" /> New request
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Open requests", value: openCount, icon: FileCheck2, color: "#2563EB", bg: "rgba(37,99,235,0.1)" },
          { label: "Overdue", value: overdueCount, icon: AlertTriangle, color: "#DC2626", bg: "rgba(220,38,38,0.1)" },
          { label: "Due soon", value: dueSoonCount, icon: Clock, color: "#D97706", bg: "rgba(217,119,6,0.1)" },
          { label: "Done this month", value: doneThisMonth, icon: CheckCircle2, color: "#15803D", bg: "rgba(21,128,61,0.1)" },
        ].map((s) => (
          <div key={s.label} className="dashboard-card p-5">
            <div className="flex items-start justify-between">
              <div><p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p></div>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.bg }}>
                <s.icon style={{ width: 18, height: 18, color: s.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input className="pl-8 h-9 text-sm" placeholder="Search member, service, ref…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={stageFilter} onValueChange={(v) => setStageFilter(v ?? "OPEN")}>
          <SelectTrigger className="w-[170px] h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="ALL">All stages</SelectItem>
            {PRO_STAGES.map((s) => <SelectItem key={s} value={s}>{PRO_STAGE_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={urgencyFilter} onValueChange={(v) => setUrgencyFilter(v ?? "ALL")}>
          <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Any urgency</SelectItem>
            {URGENCIES.map((u) => <SelectItem key={u} value={u}>{URGENCY_META[u].label}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} request{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Queue */}
      {filtered.length === 0 ? (
        <div className="dashboard-card p-12 text-center">
          <FileCheck2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">No requests</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">Create a government-liaison request for a member</p>
          <Button onClick={() => setOpen(true)} variant="outline">New request</Button>
        </div>
      ) : (
        <div className="dashboard-card overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[680px]">
            <thead>
              <tr className="border-b border-gray-100">
                {["Member", "Service", "Stage", "SLA / Due", "Assignee", ""].map((h) => (
                  <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 first:pl-5 last:pr-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((r) => {
                const stm = PRO_STAGE_META[r.stage as keyof typeof PRO_STAGE_META] ?? PRO_STAGE_META.SUBMITTED;
                const urg = URGENCY_META[r.urgency as keyof typeof URGENCY_META] ?? URGENCY_META.STANDARD;
                const sla = slaStatus(r.dueDate, r.stage);
                const slaB = SLA_BADGE[sla]!;
                return (
                  <tr key={r.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => router.push(`/dashboard/pro-services/${r.id}`)}>
                    <td className="px-4 py-3 pl-5">
                      <p className="font-medium text-gray-900">{r.memberName}</p>
                      {r.referenceNumber && <p className="text-[11px] text-gray-400 font-mono">{r.referenceNumber}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">{serviceTypeLabel(r.serviceType)}</p>
                      <span className={cn("inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full", urg.bg, urg.text)}>{urg.label}</span>
                      {r.governingBody && <span className="text-[10px] text-gray-400 ml-1.5">{r.governingBody}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full", stm.bg, stm.text)}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: stm.dot }} />
                        {PRO_STAGE_LABELS[r.stage as keyof typeof PRO_STAGE_LABELS]}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", slaB.bg, slaB.text)}>{slaB.label}</span>
                      {r.dueDate && <p className="text-[11px] text-gray-400 mt-0.5">{formatDate(r.dueDate)}</p>}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-500">{r.assignedTo ? staffMap[r.assignedTo] ?? "—" : "—"}</td>
                    <td className="px-4 py-3 pr-5 text-right"><ChevronRight className="w-4 h-4 text-gray-300 inline" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* New request dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>New PRO service request</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2 max-h-[66vh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label>Member *</Label>
              <Select value={form.memberId} onValueChange={(v) => setForm((f) => ({ ...f, memberId: v ?? "" }))}>
                <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>
                  {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Service type *</Label>
                <Select value={form.serviceType} onValueChange={(v) => setForm((f) => ({ ...f, serviceType: v ?? "OTHER" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPE_GROUPS.map((g) => (
                      <div key={g.label}>
                        <p className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase">{g.label}</p>
                        {g.types.map((t) => <SelectItem key={t} value={t}>{SERVICE_TYPE_LABELS[t]}</SelectItem>)}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Jurisdiction</Label>
                <Select value={form.jurisdiction} onValueChange={(v) => setForm((f) => ({ ...f, jurisdiction: v ?? "UAE" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="UAE">UAE</SelectItem><SelectItem value="KSA">KSA</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Urgency</Label>
                <Select value={form.urgency} onValueChange={(v) => setForm((f) => ({ ...f, urgency: v ?? "STANDARD" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {URGENCIES.map((u) => <SelectItem key={u} value={u}>{URGENCY_META[u].label} · {URGENCY_META[u].slaDays}d SLA</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Governing body</Label>
                <Select value={form.governingBody} onValueChange={(v) => setForm((f) => ({ ...f, governingBody: v ?? "" }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {GOVERNING_BODIES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Fee</Label>
                <Input type="number" min={0} value={form.fee} onChange={(e) => setForm((f) => ({ ...f, fee: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>SLA days</Label>
                <Input type="number" min={0} placeholder="auto" value={form.slaDays} onChange={(e) => setForm((f) => ({ ...f, slaDays: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Due date</Label>
                <Input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Reference #</Label>
                <Input value={form.referenceNumber} onChange={(e) => setForm((f) => ({ ...f, referenceNumber: e.target.value }))} />
              </div>
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
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={form.serviceDescription} onChange={(e) => setForm((f) => ({ ...f, serviceDescription: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Client note <span className="text-gray-400 font-normal text-[11px]">visible to member</span></Label>
              <Textarea rows={2} value={form.clientNotes} onChange={(e) => setForm((f) => ({ ...f, clientNotes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create} disabled={saving} className="text-white" style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Create request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
