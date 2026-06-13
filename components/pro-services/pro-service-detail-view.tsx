"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Loader2, Plus, Eye, EyeOff, MessageCircle, CheckCircle2, XCircle, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn, formatCurrency, formatDate, formatRelative } from "@/lib/utils";
import {
  PRO_STAGES, PRO_STAGE_LABELS, PRO_STAGE_META, URGENCY_META, GOVERNING_BODIES, serviceTypeLabel, slaStatus,
} from "@/lib/pro-services/meta";

type Activity = { id: string; userId: string; note: string; stage: string | null; isClientVisible: boolean; createdAt: string };
type Request = {
  id: string; memberId: string; memberName: string; serviceType: string; serviceDescription: string | null;
  jurisdiction: string; stage: string; urgency: string; governingBody: string | null; referenceNumber: string | null;
  assignedTo: string | null; fee: number | null; currency: string; slaDays: number | null; dueDate: string | null;
  completedAt: string | null; cancelReason: string | null; clientNotes: string | null; internalNotes: string | null;
  createdAt: string; activities: Activity[];
};
type Props = { request: Request; staff: { userId: string; name: string }[]; staffMap: Record<string, string> };

export function ProServiceDetailView({ request, staff, staffMap }: Props) {
  const router = useRouter();
  const r = request;
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [clientVisible, setClientVisible] = useState(true);
  const [sendWa, setSendWa] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const stm = PRO_STAGE_META[r.stage as keyof typeof PRO_STAGE_META] ?? PRO_STAGE_META.SUBMITTED;
  const urg = URGENCY_META[r.urgency as keyof typeof URGENCY_META] ?? URGENCY_META.STANDARD;
  const sla = slaStatus(r.dueDate, r.stage);

  async function patch(payload: any, msg?: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/pro-services/${r.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      if (msg) toast.success(msg);
      router.refresh();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
      return false;
    } finally { setBusy(false); }
  }

  async function addActivity() {
    if (!note.trim()) { toast.error("Enter a note"); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/pro-services/${r.id}/activities`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note, isClientVisible: clientVisible, sendWhatsApp: sendWa }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success(sendWa ? "Logged & WhatsApp queued" : "Update logged");
      setNote(""); setSendWa(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to log");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-3 flex-wrap">
        <Link href="/dashboard/pro-services" className="p-1.5 rounded-lg hover:bg-black/5 mt-1">
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{serviceTypeLabel(r.serviceType)}</h1>
            <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full", stm.bg, stm.text)}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: stm.dot }} />
              {PRO_STAGE_LABELS[r.stage as keyof typeof PRO_STAGE_LABELS]}
            </span>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", urg.bg, urg.text)}>{urg.label}</span>
            {sla === "overdue" && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">Overdue</span>}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            <Link href={`/dashboard/members/${r.memberId}`} className="hover:text-emerald-600">{r.memberName}</Link>
            {" · "}{r.jurisdiction}{r.governingBody ? ` · ${r.governingBody}` : ""}
          </p>
        </div>
      </div>

      {/* Stage mover */}
      <div className="dashboard-card p-3 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400 font-medium px-1">Stage</span>
        <Select value={r.stage} onValueChange={(v) => v && v !== r.stage && patch({ stage: v }, `Updated to ${PRO_STAGE_LABELS[v as keyof typeof PRO_STAGE_LABELS]}`)} disabled={busy}>
          <SelectTrigger className="w-[200px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{PRO_STAGES.map((s) => <SelectItem key={s} value={s}>{PRO_STAGE_LABELS[s]}</SelectItem>)}</SelectContent>
        </Select>
        <span className="text-[11px] text-gray-400">Client is notified on stage changes</span>
        <div className="flex-1" />
        {r.stage !== "COMPLETED" && r.stage !== "CANCELLED" && (
          <>
            <Button variant="outline" size="sm" className="h-8 text-xs text-emerald-600 border-emerald-100 hover:bg-emerald-50" onClick={() => patch({ stage: "COMPLETED" }, "Marked completed")}>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Complete
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs text-red-500 border-red-100 hover:bg-red-50" onClick={() => { setCancelReason(""); setCancelOpen(true); }}>
              <XCircle className="w-3.5 h-3.5 mr-1" /> Cancel
            </Button>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activity timeline */}
        <div className="lg:col-span-2 space-y-4">
          <div className="dashboard-card p-4 space-y-3">
            <Textarea rows={2} placeholder="Add an update…" value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={() => setClientVisible((v) => !v)}
                className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-md", clientVisible ? "text-emerald-600 bg-emerald-50" : "text-gray-400 bg-gray-50")}>
                {clientVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {clientVisible ? "Client-visible" : "Internal only"}
              </button>
              <label className="inline-flex items-center gap-1.5 text-[11px] text-gray-500 cursor-pointer">
                <input type="checkbox" checked={sendWa} onChange={(e) => setSendWa(e.target.checked)} className="w-3.5 h-3.5 rounded border-gray-300 text-emerald-600" />
                <MessageCircle className="w-3.5 h-3.5" /> Send to client
              </label>
              <div className="flex-1" />
              <Button size="sm" onClick={addActivity} disabled={busy} className="text-white" style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />} Log
              </Button>
            </div>
          </div>

          <div className="dashboard-card divide-y divide-gray-50">
            {r.activities.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">No updates yet</p>
            ) : r.activities.map((a) => (
              <div key={a.id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap flex-1">{a.note}</p>
                  {!a.isClientVisible && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 flex-shrink-0">Internal</span>}
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">{staffMap[a.userId] ?? "—"} · {formatRelative(a.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-4">
          <div className="dashboard-card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Details</h2>
            <EditField label="Reference number" value={r.referenceNumber ?? ""} onSave={(v) => patch({ referenceNumber: v || null }, "Saved")} />
            <div className="space-y-1.5">
              <Label className="text-[11px] text-gray-400">Governing body</Label>
              <Select value={r.governingBody ?? ""} onValueChange={(v) => patch({ governingBody: v || null }, "Saved")} disabled={busy}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">—</SelectItem>
                  {GOVERNING_BODIES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Info label="Fee" value={r.fee != null ? formatCurrency(r.fee, r.currency) : "—"} />
            <Info label="SLA" value={r.slaDays != null ? `${r.slaDays} days` : "—"} />
            <Info label="Due" value={r.dueDate ? formatDate(r.dueDate) : "—"} />
            <Info label="Created" value={formatDate(r.createdAt)} />
            {r.completedAt && <Info label="Completed" value={formatDate(r.completedAt)} />}
            {r.cancelReason && <Info label="Cancel reason" value={r.cancelReason} />}
          </div>

          <div className="dashboard-card p-5 space-y-2">
            <h2 className="text-sm font-semibold text-gray-900">Assigned to</h2>
            <Select value={r.assignedTo ?? ""} onValueChange={(v) => patch({ assignedTo: v || null }, "Reassigned")} disabled={busy}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {staff.map((s) => <SelectItem key={s.userId} value={s.userId}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="dashboard-card p-5 space-y-2">
            <h2 className="text-sm font-semibold text-gray-900">Internal notes</h2>
            <Textarea rows={3} defaultValue={r.internalNotes ?? ""} onBlur={(e) => { if (e.target.value !== (r.internalNotes ?? "")) patch({ internalNotes: e.target.value || null }, "Notes saved"); }} />
          </div>
        </div>
      </div>

      {/* Cancel dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Cancel request</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea rows={2} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Back</Button>
            <Button className="text-white bg-red-600 hover:bg-red-700" disabled={busy}
              onClick={async () => { const ok = await patch({ stage: "CANCELLED", cancelReason: cancelReason || null }, "Request cancelled"); if (ok) setCancelOpen(false); }}>
              Cancel request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-gray-400">{label}</span>
      <span className="text-sm text-gray-800 font-medium">{value}</span>
    </div>
  );
}

function EditField({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] text-gray-400">{label}</Label>
      <Input className="h-8 text-sm" value={v} onChange={(e) => setV(e.target.value)} onBlur={() => { if (v !== value) onSave(v); }} />
    </div>
  );
}
