"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Loader2, Plus, Eye, EyeOff, MessageCircle, CheckCircle2, XCircle, Receipt,
  Paperclip, Download, FileUp, ClipboardList, Trash2, AlertTriangle, ArrowRight,
  Hash, Info as InfoIcon, Zap,
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
type Step = { step: string; status: string; completedAt?: string | null };
type Request = {
  id: string; memberId: string; memberName: string; serviceType: string; serviceDescription: string | null;
  jurisdiction: string; stage: string; urgency: string; governingBody: string | null; referenceNumber: string | null;
  assignedTo: string | null; fee: number | null; currency: string; slaDays: number | null; dueDate: string | null;
  completedAt: string | null; cancelReason: string | null; clientNotes: string | null; internalNotes: string | null;
  invoiceId: string | null; steps: Step[]; createdAt: string; activities: Activity[];
};
type DocItem = { id: string; fileName: string; mimeType: string; fileSize: number; documentType: string; label: string | null; uploadedAt: string; downloadUrl: string | null };
type Props = { request: Request; staff: { userId: string; name: string }[]; staffMap: Record<string, string> };

type BannerVariant = "emerald" | "amber" | "blue";
type ActionBanner = {
  icon: React.ReactNode;
  headline: string;
  sub?: string;
  variant: BannerVariant;
  action?: { label: string; onClick: () => void };
};

function getNextAction(
  r: Request,
  steps: Step[],
  invoiceId: string | null,
  patch: (payload: any, msg?: string) => Promise<boolean>,
): ActionBanner | null {
  if (r.stage === "CANCELLED") return null;

  if (r.stage === "COMPLETED") {
    if (!invoiceId) {
      return {
        icon: <Receipt className="w-4 h-4" />,
        headline: "Service complete — generate the invoice",
        sub: r.fee != null ? `Fee set: ${formatCurrency(r.fee, r.currency)}` : "Set a fee in the Details panel first.",
        variant: "amber",
      };
    }
    return null;
  }

  if (r.stage === "SUBMITTED") {
    return {
      icon: <ArrowRight className="w-4 h-4" />,
      headline: "New request — start processing",
      sub: "Move to In Progress to begin handling this service.",
      variant: "blue",
      action: { label: "Start processing", onClick: () => { void patch({ stage: "IN_PROGRESS" }, "Started processing"); } },
    };
  }

  if (r.stage === "DOCUMENTS_PENDING") {
    return {
      icon: <AlertTriangle className="w-4 h-4" />,
      headline: "Waiting for client documents",
      sub: "Log an update or send a WhatsApp reminder to chase the client.",
      variant: "amber",
    };
  }

  if (r.stage === "DOCUMENTS_RECEIVED") {
    return {
      icon: <CheckCircle2 className="w-4 h-4" />,
      headline: "Documents received — verify and proceed",
      sub: "Check the attached documents, then move to In Progress.",
      variant: "emerald",
      action: { label: "Move to In Progress", onClick: () => { void patch({ stage: "IN_PROGRESS" }, "Moved to In Progress"); } },
    };
  }

  if (r.stage === "IN_PROGRESS") {
    if (!r.referenceNumber) {
      return {
        icon: <Hash className="w-4 h-4" />,
        headline: "Record the government reference number",
        sub: "Enter the authority reference in the Details panel on the right.",
        variant: "amber",
      };
    }
    const pending = steps.filter((s) => s.status !== "done");
    if (pending.length > 0) {
      return {
        icon: <ClipboardList className="w-4 h-4" />,
        headline: `${pending.length} step${pending.length !== 1 ? "s" : ""} remaining`,
        sub: `Next: "${pending[0].step}"`,
        variant: "blue",
      };
    }
    return {
      icon: <CheckCircle2 className="w-4 h-4" />,
      headline: "All steps complete — ready for collection",
      sub: "Move to Awaiting Collection and notify the client.",
      variant: "emerald",
      action: { label: "Mark awaiting collection", onClick: () => { void patch({ stage: "AWAITING_COLLECTION" }, "Moved to Awaiting Collection"); } },
    };
  }

  if (r.stage === "AT_TYPING_CENTRE") {
    return {
      icon: <InfoIcon className="w-4 h-4" />,
      headline: "At typing centre — awaiting processing",
      sub: "Log updates as you receive them.",
      variant: "blue",
    };
  }

  if (r.stage === "AT_GOVERNMENT") {
    const pending = steps.filter((s) => s.status !== "done");
    return {
      icon: <InfoIcon className="w-4 h-4" />,
      headline: "Submitted to authority — monitoring",
      sub: pending.length > 0
        ? `${pending.length} step${pending.length !== 1 ? "s" : ""} remaining`
        : r.referenceNumber
          ? `Ref: ${r.referenceNumber}`
          : "Record the reference number when received.",
      variant: "blue",
    };
  }

  if (r.stage === "AWAITING_COLLECTION") {
    return {
      icon: <Zap className="w-4 h-4" />,
      headline: "Ready for collection — notify the client",
      sub: "Mark as complete once the client has collected.",
      variant: "emerald",
      action: { label: "Mark complete", onClick: () => { void patch({ stage: "COMPLETED" }, "Marked completed"); } },
    };
  }

  if (r.stage === "ON_HOLD") {
    return {
      icon: <AlertTriangle className="w-4 h-4" />,
      headline: "On hold — resolve the issue to continue",
      sub: "Log the reason below and move back to In Progress when ready.",
      variant: "amber",
    };
  }

  return null;
}

const BANNER_STYLES: Record<BannerVariant, { wrapper: string; icon: string; headline: string; sub: string; btn: string }> = {
  emerald: { wrapper: "bg-emerald-50 border-emerald-200", icon: "text-emerald-600", headline: "text-emerald-900", sub: "text-emerald-700", btn: "bg-emerald-600 hover:bg-emerald-700 text-white" },
  amber: { wrapper: "bg-amber-50 border-amber-200", icon: "text-amber-600", headline: "text-amber-900", sub: "text-amber-700", btn: "bg-amber-600 hover:bg-amber-700 text-white" },
  blue: { wrapper: "bg-blue-50 border-blue-200", icon: "text-blue-600", headline: "text-blue-900", sub: "text-blue-700", btn: "bg-blue-600 hover:bg-blue-700 text-white" },
};

function NextActionBanner({ banner, busy }: { banner: ActionBanner; busy: boolean }) {
  const s = BANNER_STYLES[banner.variant];
  return (
    <div className={cn("flex items-center gap-3 px-4 py-3 rounded-xl border", s.wrapper)}>
      <span className={cn("flex-shrink-0", s.icon)}>{banner.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-semibold leading-tight", s.headline)}>{banner.headline}</p>
        {banner.sub && <p className={cn("text-[11px] mt-0.5", s.sub)}>{banner.sub}</p>}
      </div>
      {banner.action && (
        <Button
          size="sm"
          onClick={banner.action.onClick}
          disabled={busy}
          className={cn("flex-shrink-0 text-xs h-8 px-3 font-medium border-0", s.btn)}
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : banner.action.label}
        </Button>
      )}
    </div>
  );
}

export function ProServiceDetailView({ request, staff, staffMap }: Props) {
  const router = useRouter();
  const r = request;
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [clientVisible, setClientVisible] = useState(true);
  const [sendWa, setSendWa] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const [invoiceId, setInvoiceId] = useState(r.invoiceId);
  const [invoiceBusy, setInvoiceBusy] = useState(false);

  const [steps, setSteps] = useState<Step[]>(r.steps ?? []);
  const [newStep, setNewStep] = useState("");
  const [stepsBusy, setStepsBusy] = useState(false);

  const [docs, setDocs] = useState<DocItem[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDocsLoading(true);
    fetch(`/api/pro-services/${r.id}/documents`)
      .then((res) => res.json())
      .then((data) => setDocs(data.documents ?? []))
      .catch(() => {})
      .finally(() => setDocsLoading(false));
  }, [r.id]);

  async function uploadDoc(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("metadata", JSON.stringify({
        memberId: r.memberId,
        documentType: "OTHER",
        label: file.name.replace(/\.[^.]+$/, ""),
        proServiceRequestId: r.id,
      }));
      const res = await fetch("/api/documents", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Document uploaded");
      const refreshed = await fetch(`/api/pro-services/${r.id}/documents`).then((r) => r.json());
      setDocs(refreshed.documents ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally { setUploading(false); }
  }

  const stm = PRO_STAGE_META[r.stage as keyof typeof PRO_STAGE_META] ?? PRO_STAGE_META.SUBMITTED;
  const urg = URGENCY_META[r.urgency as keyof typeof URGENCY_META] ?? URGENCY_META.STANDARD;
  const sla = slaStatus(r.dueDate, r.stage);

  async function saveSteps(next: Step[]) {
    setStepsBusy(true);
    try {
      const res = await fetch(`/api/pro-services/${r.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ steps: next }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save steps");
    } finally { setStepsBusy(false); }
  }

  function cycleStep(i: number) {
    const next = steps.map((s, j) => j !== i ? s : {
      ...s,
      status: s.status === "pending" ? "in_progress" : s.status === "in_progress" ? "done" : "pending",
      completedAt: s.status === "in_progress" ? new Date().toISOString() : null,
    });
    setSteps(next); saveSteps(next);
  }

  async function generateInvoice() {
    setInvoiceBusy(true);
    try {
      const res = await fetch(`/api/pro-services/${r.id}/invoice`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Invoice ${data.invoiceNumber} generated`);
      setInvoiceId(data.invoiceId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate invoice");
    } finally { setInvoiceBusy(false); }
  }

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

  const banner = getNextAction(r, steps, invoiceId, patch);
  const doneCount = steps.filter((s) => s.status === "done").length;

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Back */}
      <Link href="/dashboard/pro-services"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to PRO services
      </Link>

      {/* Header */}
      <div className="flex items-start gap-3 flex-wrap">
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
        <Select
          value={r.stage}
          onValueChange={(v) => v && v !== r.stage && patch({ stage: v }, `Updated to ${PRO_STAGE_LABELS[v as keyof typeof PRO_STAGE_LABELS]}`)}
          disabled={busy}
        >
          <SelectTrigger className="w-[200px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{PRO_STAGES.map((s) => <SelectItem key={s} value={s}>{PRO_STAGE_LABELS[s]}</SelectItem>)}</SelectContent>
        </Select>
        <span className="text-[11px] text-gray-400">Client is notified on stage changes</span>
        <div className="flex-1" />
        {r.stage !== "COMPLETED" && r.stage !== "CANCELLED" && (
          <>
            <Button variant="outline" size="sm" className="h-8 text-xs text-emerald-600 border-emerald-100 hover:bg-emerald-50"
              onClick={() => patch({ stage: "COMPLETED" }, "Marked completed")}>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Complete
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs text-red-500 border-red-100 hover:bg-red-50"
              onClick={() => { setCancelReason(""); setCancelOpen(true); }}>
              <XCircle className="w-3.5 h-3.5 mr-1" /> Cancel
            </Button>
          </>
        )}
      </div>

      {/* Next-action banner */}
      {banner && <NextActionBanner banner={banner} busy={busy} />}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left — activity + steps */}
        <div className="lg:col-span-2 space-y-4">

          {/* Activity composer */}
          <div className="dashboard-card p-4 space-y-3">
            <Textarea rows={3} placeholder="Add an update…" value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={() => setClientVisible((v) => !v)}
                className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-md", clientVisible ? "text-emerald-600 bg-emerald-50" : "text-gray-400 bg-gray-50")}>
                {clientVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {clientVisible ? "Client-visible" : "Internal only"}
              </button>
              <label className="inline-flex items-center gap-1.5 text-[11px] text-gray-500 cursor-pointer select-none">
                <input type="checkbox" checked={sendWa} onChange={(e) => setSendWa(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-emerald-600" />
                <MessageCircle className="w-3.5 h-3.5" /> Send to client
              </label>
              <div className="flex-1" />
              <Button size="sm" onClick={addActivity} disabled={busy}
                className="text-white" style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />} Log update
              </Button>
            </div>
          </div>

          {/* Steps checklist */}
          <div className="dashboard-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-900">Steps</h2>
              {steps.length > 0 && (
                <span className={cn(
                  "ml-1 text-[11px] font-medium px-2 py-0.5 rounded-full",
                  doneCount === steps.length ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"
                )}>
                  {doneCount}/{steps.length} done
                </span>
              )}
              {stepsBusy && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-300 ml-auto" />}
            </div>

            {steps.length === 0 ? (
              <p className="text-[12px] text-gray-400">No steps yet. Add the first step below to track progress.</p>
            ) : (
              <div className="space-y-2">
                {steps.map((s, i) => {
                  const isDone = s.status === "done";
                  const isProgress = s.status === "in_progress";
                  return (
                    <div key={i} className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors",
                      isDone ? "bg-emerald-50/60 border-emerald-100" : isProgress ? "bg-amber-50/60 border-amber-100" : "bg-gray-50 border-gray-100"
                    )}>
                      <button disabled={stepsBusy} onClick={() => cycleStep(i)} className="flex-shrink-0">
                        <span className={cn(
                          "flex items-center justify-center w-5 h-5 rounded-full border-2 transition-colors",
                          isDone ? "border-emerald-500 bg-emerald-500" : isProgress ? "border-amber-400 bg-amber-50" : "border-gray-300 bg-white"
                        )}>
                          {isDone && <CheckCircle2 className="w-3 h-3 text-white" />}
                          {isProgress && <span className="w-2 h-2 rounded-full bg-amber-400" />}
                        </span>
                      </button>
                      <span className={cn("text-[12px] flex-1 leading-tight", isDone ? "line-through text-gray-400" : isProgress ? "text-amber-800 font-medium" : "text-gray-700")}>
                        {s.step}
                      </span>
                      {isProgress && <span className="text-[9px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">In progress</span>}
                      {isDone && s.completedAt && <span className="text-[10px] text-gray-400">{formatDate(s.completedAt)}</span>}
                      <button onClick={() => { const next = steps.filter((_, j) => j !== i); setSteps(next); saveSteps(next); }}
                        className="text-gray-200 hover:text-red-400 flex-shrink-0 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <input
                className="flex-1 h-8 text-[12px] px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-400 bg-white"
                placeholder="Add a step…"
                value={newStep}
                onChange={(e) => setNewStep(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newStep.trim()) {
                    const next = [...steps, { step: newStep.trim(), status: "pending" }];
                    setSteps(next); setNewStep(""); saveSteps(next);
                  }
                }}
              />
              <button
                disabled={!newStep.trim() || stepsBusy}
                onClick={() => { const next = [...steps, { step: newStep.trim(), status: "pending" }]; setSteps(next); setNewStep(""); saveSteps(next); }}
                className="h-8 px-3 text-[11px] font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 disabled:opacity-40 transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {/* Activity timeline */}
          <div className="dashboard-card divide-y divide-gray-50">
            <div className="px-5 py-3">
              <h2 className="text-sm font-semibold text-gray-700">Activity</h2>
            </div>
            {r.activities.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">No updates yet</p>
            ) : r.activities.map((a) => (
              <div key={a.id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap flex-1">{a.note}</p>
                  {!a.isClientVisible && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 flex-shrink-0">Internal</span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">{staffMap[a.userId] ?? "—"} · {formatRelative(a.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right — details sidebar */}
        <div className="space-y-4">

          {/* Details */}
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
            <InfoRow label="Fee" value={r.fee != null ? formatCurrency(r.fee, r.currency) : "—"} />
            <InfoRow label="SLA" value={r.slaDays != null ? `${r.slaDays} days` : "—"} />
            <InfoRow label="Due" value={r.dueDate ? formatDate(r.dueDate) : "—"} highlight={sla === "overdue" ? "red" : sla === "warning" ? "amber" : undefined} />
            <InfoRow label="Created" value={formatDate(r.createdAt)} />
            {r.completedAt && <InfoRow label="Completed" value={formatDate(r.completedAt)} />}
            {r.cancelReason && <InfoRow label="Cancel reason" value={r.cancelReason} />}
          </div>

          {/* Invoice */}
          <div className="dashboard-card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Invoice</h2>
            {invoiceId ? (
              <Link href={`/dashboard/invoices?id=${invoiceId}`}
                className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                <Receipt className="w-4 h-4" /> View invoice
              </Link>
            ) : (
              <div className="space-y-2">
                {r.fee == null && (
                  <p className="text-[11px] text-gray-400">Set a fee in Details to enable invoice generation.</p>
                )}
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={generateInvoice}
                  disabled={invoiceBusy || r.fee == null}>
                  {invoiceBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Receipt className="w-3.5 h-3.5 mr-1" />}
                  Generate invoice
                </Button>
              </div>
            )}
          </div>

          {/* Assigned to */}
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

          {/* Internal notes */}
          <div className="dashboard-card p-5 space-y-2">
            <h2 className="text-sm font-semibold text-gray-900">Internal notes</h2>
            <Textarea
              rows={3}
              defaultValue={r.internalNotes ?? ""}
              placeholder="Notes visible only to your team…"
              onBlur={(e) => { if (e.target.value !== (r.internalNotes ?? "")) patch({ internalNotes: e.target.value || null }, "Notes saved"); }}
            />
          </div>

          {/* Documents */}
          <div className="dashboard-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-gray-400" /> Documents
                {docs.length > 0 && <span className="text-[11px] text-gray-400 font-normal">({docs.length})</span>}
              </h2>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-gray-500 gap-1"
                onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileUp className="w-3.5 h-3.5" />}
                {!uploading && "Upload"}
              </Button>
              <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) { uploadDoc(f); e.target.value = ""; } }} />
            </div>
            {docsLoading ? (
              <p className="text-[11px] text-gray-400">Loading…</p>
            ) : docs.length === 0 ? (
              <div className="text-center py-4">
                <Paperclip className="w-6 h-6 text-gray-200 mx-auto mb-1" />
                <p className="text-[11px] text-gray-400">No documents attached yet.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {docs.map((d) => (
                  <div key={d.id} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                    <span className="text-[11px] text-gray-700 flex-1 truncate">{d.label ?? d.fileName}</span>
                    {d.downloadUrl && (
                      <a href={d.downloadUrl} target="_blank" rel="noopener noreferrer"
                        className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cancel dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Cancel request</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label>Reason (optional)</Label>
              <Textarea rows={2} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="e.g. Client withdrew the request" />
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

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: "red" | "amber" }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-gray-400 flex-shrink-0">{label}</span>
      <span className={cn(
        "text-sm font-medium text-right",
        highlight === "red" ? "text-red-600" : highlight === "amber" ? "text-amber-600" : "text-gray-800"
      )}>{value}</span>
    </div>
  );
}

function EditField({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] text-gray-400">{label}</Label>
      <Input className="h-8 text-sm" value={v} onChange={(e) => setV(e.target.value)}
        onBlur={() => { if (v !== value) onSave(v); }} />
    </div>
  );
}
