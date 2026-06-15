"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Phone, Mail, MessageCircle, Loader2, Plus, Trash2, Send, Download,
  Trophy, XCircle, UserPlus, Check, FileText, ClipboardList, Activity as ActivityIcon, Info,
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
  LEAD_STAGES, LEAD_STAGE_LABELS, LEAD_STAGE_COLORS, LEAD_PRIORITY_META, ACTIVITY_TYPES,
  ACTIVITY_META, activityGlyph, activityLabel, stageLabel,
} from "@/lib/business-setup/meta";
import { licenseTypeLabel } from "@/lib/license-catalog/uae";

type Activity = { id: string; activityType: string; note: string; userId: string; createdAt: string };
type Proposal = {
  id: string; lineItems: { service: string; description?: string | null; fee: number }[];
  subtotal: number; totalFee: number; currency: string; validUntil: string;
  status: string; notes: string | null; sentAt: string | null; acceptedAt: string | null;
} | null;
type Application = {
  id: string; referenceNumber: string | null; authorityName: string | null; currentStep: string | null;
  steps: { step: string; status: string; completedAt?: string | null; notes?: string | null }[];
  submittedAt: string | null; approvedAt: string | null; licenseNumber: string | null; licenseExpiry: string | null; notes: string | null;
} | null;

type Lead = {
  id: string; clientName: string; companyName: string | null; clientEmail: string | null;
  clientPhone: string; clientWhatsapp: string | null; clientNationality: string | null;
  jurisdiction: string; licenseType: string; freezoneName: string | null; sezName: string | null;
  businessActivity: string[]; stage: string; priority: string; assignedTo: string | null;
  estimatedFee: number | null; quotedFee: number | null; currency: string; source: string | null;
  expectedCloseDate: string | null; notes: string | null; lostReason: string | null; createdAt: string;
  activities: Activity[]; proposal: Proposal; application: Application;
  member: { id: string; name: string | null; email: string } | null;
  catalogProduct: { authority: string; name: string; baseCost: number | null; govFees: number | null; visaQuota: number | null; officeType: string | null } | null;
};

type Props = { lead: Lead; staff: { userId: string; name: string }[]; staffMap: Record<string, string> };

export function LeadDetailView({ lead, staff, staffMap }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"overview" | "activity" | "proposal" | "application">("overview");
  const [busy, setBusy] = useState(false);

  // activity
  const [actType, setActType] = useState("NOTE");
  const [actNote, setActNote] = useState("");

  // lose dialog
  const [loseOpen, setLoseOpen] = useState(false);
  const [loseReason, setLoseReason] = useState("");

  const colors = LEAD_STAGE_COLORS[lead.stage as keyof typeof LEAD_STAGE_COLORS] ?? LEAD_STAGE_COLORS.NEW_ENQUIRY;
  const pri = LEAD_PRIORITY_META[lead.priority as keyof typeof LEAD_PRIORITY_META] ?? LEAD_PRIORITY_META.MEDIUM;

  async function patchLead(payload: any, successMsg?: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/business-setup/leads/${lead.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      if (successMsg) toast.success(successMsg);
      router.refresh();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function addActivity() {
    if (!actNote.trim()) { toast.error("Enter a note"); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/business-setup/leads/${lead.id}/activities`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityType: actType, note: actNote }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success(actType === "WHATSAPP" ? "Logged & WhatsApp queued" : "Activity logged");
      setActNote("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to log");
    } finally {
      setBusy(false);
    }
  }

  async function convert() {
    if (!lead.clientEmail) { toast.error("Add a client email first"); return; }
    if (!confirm(`Convert ${lead.clientName} into a member?`)) return;
    await patchLead({ action: "convert" }, "Converted to member");
  }

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-start gap-3 flex-wrap">
        <Link href="/dashboard/business-setup/leads" className="p-1.5 rounded-lg hover:bg-black/5 mt-1">
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{lead.clientName}</h1>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", colors.bg, colors.text)}>{stageLabel(lead.stage)}</span>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", pri.bg, pri.text)}>{pri.label}</span>
            {lead.member && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Member</span>}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {lead.companyName ? `${lead.companyName} · ` : ""}{licenseTypeLabel(lead.licenseType)} · {lead.jurisdiction}
          </p>
        </div>
        {/* quick actions */}
        <div className="flex items-center gap-2">
          {lead.clientPhone && <a href={`tel:${lead.clientPhone}`}><Button variant="outline" size="sm" className="h-8 w-8 p-0"><Phone className="w-3.5 h-3.5" /></Button></a>}
          {lead.clientEmail && <a href={`mailto:${lead.clientEmail}`}><Button variant="outline" size="sm" className="h-8 w-8 p-0"><Mail className="w-3.5 h-3.5" /></Button></a>}
        </div>
      </div>

      {/* Stage mover + win/lose */}
      <div className="dashboard-card p-3 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400 font-medium px-1">Stage</span>
        <Select value={lead.stage} onValueChange={(v) => v && v !== lead.stage && patchLead({ stage: v }, `Moved to ${stageLabel(v)}`)} disabled={busy}>
          <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {LEAD_STAGES.map((st) => <SelectItem key={st} value={st}>{LEAD_STAGE_LABELS[st]}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        {lead.stage !== "COMPLETED" && lead.stage !== "LOST" && (
          <>
            <Button variant="outline" size="sm" className="h-8 text-xs text-emerald-600 border-emerald-100 hover:bg-emerald-50" onClick={() => patchLead({ stage: "COMPLETED" }, "Marked won")}>
              <Trophy className="w-3.5 h-3.5 mr-1" /> Mark won
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs text-red-500 border-red-100 hover:bg-red-50" onClick={() => { setLoseReason(""); setLoseOpen(true); }}>
              <XCircle className="w-3.5 h-3.5 mr-1" /> Mark lost
            </Button>
          </>
        )}
        {!lead.member && (lead.stage === "COMPLETED" || lead.stage === "APPROVED") && (
          <Button size="sm" className="h-8 text-xs text-white" style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }} onClick={convert} disabled={busy}>
            <UserPlus className="w-3.5 h-3.5 mr-1" /> Convert to member
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-100">
        {([["overview", "Overview", Info], ["activity", "Activity", ActivityIcon], ["proposal", "Proposal", FileText], ["application", "Application", ClipboardList]] as const).map(([k, lbl, Icon]) => (
          <button key={k} onClick={() => setTab(k)}
            className={cn("px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors inline-flex items-center gap-1.5",
              tab === k ? "border-emerald-500 text-emerald-700" : "border-transparent text-gray-500 hover:text-gray-700")}>
            <Icon className="w-3.5 h-3.5" /> {lbl}
            {k === "activity" && lead.activities.length > 0 && <span className="text-[10px] text-gray-400">{lead.activities.length}</span>}
          </button>
        ))}
      </div>

      {tab === "overview" && <Overview lead={lead} staff={staff} staffMap={staffMap} patchLead={patchLead} busy={busy} />}

      {tab === "activity" && (
        <div className="space-y-4">
          <div className="dashboard-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Select value={actType} onValueChange={(v) => setActType(v ?? "NOTE")}>
                <SelectTrigger className="w-[150px] h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((t) => <SelectItem key={t} value={t}>{ACTIVITY_META[t].glyph} {ACTIVITY_META[t].label}</SelectItem>)}
                </SelectContent>
              </Select>
              {actType === "WHATSAPP" && <span className="text-[11px] text-emerald-600 inline-flex items-center gap-1"><MessageCircle className="w-3 h-3" /> Sends to the client</span>}
            </div>
            <Textarea rows={2} placeholder={actType === "WHATSAPP" ? "Message to send the client…" : "Add a note…"} value={actNote} onChange={(e) => setActNote(e.target.value)} />
            <div className="flex justify-end">
              <Button size="sm" onClick={addActivity} disabled={busy} className="text-white" style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />} Log
              </Button>
            </div>
          </div>

          <div className="dashboard-card divide-y divide-gray-50">
            {lead.activities.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">No activity yet</p>
            ) : lead.activities.map((a) => (
              <div key={a.id} className="flex items-start gap-3 px-5 py-3">
                <span className="text-lg flex-shrink-0">{activityGlyph(a.activityType)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{a.note}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {activityLabel(a.activityType)} · {staffMap[a.userId] ?? "—"} · {formatRelative(a.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "proposal" && <ProposalTab lead={lead} busy={busy} setBusy={setBusy} />}
      {tab === "application" && <ApplicationTab lead={lead} busy={busy} setBusy={setBusy} />}

      {/* Lose dialog */}
      <Dialog open={loseOpen} onOpenChange={setLoseOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Mark lead as lost</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea rows={2} placeholder="e.g. Went with a competitor, budget…" value={loseReason} onChange={(e) => setLoseReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLoseOpen(false)}>Cancel</Button>
            <Button className="text-white bg-red-600 hover:bg-red-700" disabled={busy}
              onClick={async () => { const ok = await patchLead({ stage: "LOST", lostReason: loseReason || null }, "Marked lost"); if (ok) setLoseOpen(false); }}>
              Mark lost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Overview tab ─────────────────────────────────────────────────────────────────
function Overview({ lead, staff, staffMap, patchLead, busy }: {
  lead: Lead; staff: { userId: string; name: string }[]; staffMap: Record<string, string>;
  patchLead: (p: any, m?: string) => Promise<boolean>; busy: boolean;
}) {
  const [quote, setQuote] = useState(lead.quotedFee?.toString() ?? "");
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <div className="dashboard-card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Client</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 text-sm">
            <Field label="Name" value={lead.clientName} />
            <Field label="Company" value={lead.companyName ?? "—"} />
            <Field label="Phone" value={lead.clientPhone} />
            <Field label="WhatsApp" value={lead.clientWhatsapp ?? "—"} />
            <Field label="Email" value={lead.clientEmail ?? "—"} />
            <Field label="Nationality" value={lead.clientNationality ?? "—"} />
          </div>
        </div>

        <div className="dashboard-card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Setup</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 text-sm">
            <Field label="Jurisdiction" value={lead.jurisdiction} />
            <Field label="License type" value={licenseTypeLabel(lead.licenseType)} />
            <Field label="Authority / freezone" value={lead.freezoneName ?? lead.sezName ?? "—"} />
            <Field label="Source" value={lead.source ?? "—"} />
            {lead.catalogProduct && (
              <Field label="Catalog product" value={`${lead.catalogProduct.authority} — ${lead.catalogProduct.name}`} full />
            )}
            {lead.businessActivity.length > 0 && <Field label="Activities" value={lead.businessActivity.join(", ")} full />}
          </div>
          {lead.notes && (
            <div className="mt-4">
              <p className="text-[11px] font-semibold text-gray-400 uppercase">Notes</p>
              <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="dashboard-card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Deal</h2>
          <Field label="Estimated fee" value={lead.estimatedFee != null ? formatCurrency(lead.estimatedFee, lead.currency) : "—"} />
          <div className="space-y-1.5">
            <Label className="text-[11px] text-gray-400">Quoted fee</Label>
            <div className="flex gap-2">
              <Input type="number" min={0} className="h-8 text-sm" value={quote} onChange={(e) => setQuote(e.target.value)} />
              <Button size="sm" variant="outline" className="h-8" disabled={busy}
                onClick={() => patchLead({ quotedFee: quote ? Number(quote) : null }, "Quote updated")}>Save</Button>
            </div>
          </div>
          <Field label="Expected close" value={lead.expectedCloseDate ? formatDate(lead.expectedCloseDate) : "—"} />
          <Field label="Created" value={formatDate(lead.createdAt)} />
          {lead.lostReason && <Field label="Lost reason" value={lead.lostReason} />}
        </div>

        <div className="dashboard-card p-5 space-y-2">
          <h2 className="text-sm font-semibold text-gray-900">Assigned to</h2>
          <Select value={lead.assignedTo ?? ""} onValueChange={(v) => patchLead({ assignedTo: v || null }, "Reassigned")} disabled={busy}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Unassigned" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Unassigned</SelectItem>
              {staff.map((s) => <SelectItem key={s.userId} value={s.userId}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {lead.member && (
          <div className="dashboard-card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Member</h2>
            <Link href={`/dashboard/members/${lead.member.id}`} className="text-sm text-emerald-600 hover:text-emerald-700">
              {lead.member.name ?? lead.member.email} →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <p className="text-[11px] font-semibold text-gray-400 uppercase">{label}</p>
      <p className="text-sm text-gray-800 mt-0.5 break-words">{value}</p>
    </div>
  );
}

// ── Proposal tab ─────────────────────────────────────────────────────────────────
function ProposalTab({ lead, busy, setBusy }: { lead: Lead; busy: boolean; setBusy: (b: boolean) => void }) {
  const router = useRouter();
  const p = lead.proposal;
  const [items, setItems] = useState<{ service: string; description: string; fee: string }[]>(
    p ? p.lineItems.map((li) => ({ service: li.service, description: li.description ?? "", fee: String(li.fee) }))
      : [{ service: "License & registration", description: "", fee: lead.quotedFee?.toString() ?? lead.estimatedFee?.toString() ?? "" }]
  );
  const [validUntil, setValidUntil] = useState(p ? p.validUntil.slice(0, 10) : new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10));
  const [notes, setNotes] = useState(p?.notes ?? "");

  const total = items.reduce((s, i) => s + (Number(i.fee) || 0), 0);

  async function save() {
    const lineItems = items.filter((i) => i.service.trim()).map((i) => ({ service: i.service, description: i.description || null, fee: Number(i.fee) || 0 }));
    if (lineItems.length === 0) { toast.error("Add at least one line item"); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/business-setup/leads/${lead.id}/proposal`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineItems, validUntil, notes: notes || null }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success("Proposal saved");
      router.refresh();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to save"); }
    finally { setBusy(false); }
  }

  async function action(a: "send" | "accept" | "reject") {
    setBusy(true);
    try {
      const res = await fetch(`/api/business-setup/leads/${lead.id}/proposal`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: a }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success(a === "send" ? "Proposal sent" : a === "accept" ? "Marked accepted" : "Marked rejected");
      router.refresh();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setBusy(false); }
  }

  return (
    <div className="dashboard-card p-5 space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Proposal</h2>
        {p && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">{p.status}</span>}
      </div>

      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex gap-2 items-start">
            <Input className="flex-[3]" placeholder="Service" value={it.service} onChange={(e) => setItems((arr) => arr.map((x, j) => j === i ? { ...x, service: e.target.value } : x))} />
            <Input className="flex-[3]" placeholder="Description" value={it.description} onChange={(e) => setItems((arr) => arr.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} />
            <Input className="flex-[2]" type="number" min={0} placeholder="Fee" value={it.fee} onChange={(e) => setItems((arr) => arr.map((x, j) => j === i ? { ...x, fee: e.target.value } : x))} />
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-red-400" onClick={() => setItems((arr) => arr.filter((_, j) => j !== i))}><Trash2 className="w-3.5 h-3.5" /></Button>
          </div>
        ))}
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setItems((arr) => [...arr, { service: "", description: "", fee: "" }])}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add line
        </Button>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 pt-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-gray-500">Valid until</Label>
          <Input type="date" className="h-8 w-40 text-sm" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
        </div>
        <div className="text-right">
          <span className="text-xs text-gray-400">Total</span>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(total, lead.currency)}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-gray-500">Notes</Label>
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className="flex items-center gap-2 flex-wrap pt-1">
        <Button onClick={save} disabled={busy} className="text-white" style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Save proposal
        </Button>
        {p && (
          <>
            <a href={`/api/business-setup/leads/${lead.id}/proposal/pdf`} target="_blank" rel="noreferrer">
              <Button variant="outline"><Download className="w-4 h-4 mr-1.5" /> PDF</Button>
            </a>
            {p.status === "DRAFT" && <Button variant="outline" onClick={() => action("send")} disabled={busy}><Send className="w-4 h-4 mr-1.5" /> Send</Button>}
            {p.status === "SENT" && (
              <>
                <Button variant="outline" className="text-emerald-600 border-emerald-100" onClick={() => action("accept")} disabled={busy}><Check className="w-4 h-4 mr-1.5" /> Accepted</Button>
                <Button variant="outline" className="text-red-500 border-red-100" onClick={() => action("reject")} disabled={busy}>Rejected</Button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Application tab ──────────────────────────────────────────────────────────────
function ApplicationTab({ lead, busy, setBusy }: { lead: Lead; busy: boolean; setBusy: (b: boolean) => void }) {
  const router = useRouter();
  const a = lead.application;
  const [steps, setSteps] = useState(a?.steps ?? []);
  const [ref, setRef] = useState(a?.referenceNumber ?? "");
  const [authority, setAuthority] = useState(a?.authorityName ?? lead.freezoneName ?? "");
  const [licenseNumber, setLicenseNumber] = useState(a?.licenseNumber ?? "");
  const [licenseExpiry, setLicenseExpiry] = useState(a?.licenseExpiry ? a.licenseExpiry.slice(0, 10) : "");
  const [newStep, setNewStep] = useState("");

  async function put(payload: any, msg?: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/business-setup/leads/${lead.id}/application`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      if (msg) toast.success(msg);
      router.refresh();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setBusy(false); }
  }

  function cycle(status: string) { return status === "pending" ? "in_progress" : status === "in_progress" ? "done" : "pending"; }

  if (!a) {
    return (
      <div className="dashboard-card p-8 text-center max-w-2xl">
        <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-500">No application yet</p>
        <p className="text-xs text-gray-400 mt-1 mb-4">Start tracking the formation process with a default step checklist.</p>
        <Button onClick={() => put({}, "Application started")} disabled={busy} className="text-white" style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Start application
        </Button>
      </div>
    );
  }

  const stepStyle: Record<string, string> = { pending: "bg-gray-100 text-gray-400", in_progress: "bg-amber-50 text-amber-600", done: "bg-green-50 text-green-700" };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="dashboard-card p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-500">Reference number</Label>
          <Input className="h-9 text-sm" value={ref} onChange={(e) => setRef(e.target.value)} onBlur={() => put({ referenceNumber: ref || null })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-500">Authority</Label>
          <Input className="h-9 text-sm" value={authority} onChange={(e) => setAuthority(e.target.value)} onBlur={() => put({ authorityName: authority || null })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-500">License number</Label>
          <Input className="h-9 text-sm" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} onBlur={() => put({ licenseNumber: licenseNumber || null })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-500">License expiry</Label>
          <Input type="date" className="h-9 text-sm" value={licenseExpiry} onChange={(e) => setLicenseExpiry(e.target.value)} onBlur={() => put({ licenseExpiry: licenseExpiry || null })} />
        </div>
      </div>

      <div className="dashboard-card p-5 space-y-2">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Steps</h2>
        {steps.map((st: any, i: number) => (
          <div key={i} className="flex items-center gap-3 py-1.5">
            <button onClick={() => {
              const next = steps.map((x: any, j: number) => j === i ? { ...x, status: cycle(x.status), completedAt: cycle(x.status) === "done" ? new Date().toISOString() : null } : x);
              setSteps(next); put({ steps: next });
            }} className={cn("text-[10px] font-semibold px-2 py-1 rounded-full w-24 text-center", stepStyle[st.status] ?? stepStyle.pending)}>
              {st.status === "done" ? "Done" : st.status === "in_progress" ? "In progress" : "Pending"}
            </button>
            <span className="text-sm text-gray-700 flex-1">{st.step}</span>
            <button onClick={() => { const next = steps.filter((_: any, j: number) => j !== i); setSteps(next); put({ steps: next }); }} className="text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ))}
        <div className="flex gap-2 pt-2">
          <Input className="h-8 text-sm" placeholder="Add a step…" value={newStep} onChange={(e) => setNewStep(e.target.value)} />
          <Button variant="outline" size="sm" className="h-8" disabled={!newStep.trim()} onClick={() => {
            const next = [...steps, { step: newStep, status: "pending" }]; setSteps(next); setNewStep(""); put({ steps: next });
          }}>Add</Button>
        </div>
      </div>
    </div>
  );
}
