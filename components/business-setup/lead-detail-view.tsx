"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Phone, Mail, MessageCircle, Loader2, Plus, Trash2, Send, Download,
  Trophy, XCircle, UserPlus, Check, FileText, ClipboardList, Activity as ActivityIcon, Info,
  Receipt, Paperclip, FileUp, CheckCircle2, Circle, AlertCircle, ShieldCheck, ChevronRight, Link2,
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
import { getBsDocumentRequirements } from "@/lib/business-setup/document-requirements";

const DOC_TYPE_LABELS: Record<string, string> = {
  PASSPORT: "Passport",
  EMIRATES_ID: "Emirates ID",
  VISA: "Visa / Residence permit",
  MOA: "Memorandum of Association",
  AOA: "Articles of Association",
  EJARI: "Ejari / Tenancy contract",
  TENANCY_CONTRACT: "Tenancy / Lease contract",
  BANK_STATEMENT: "Bank statement / Reference letter",
  POWER_OF_ATTORNEY: "Power of attorney",
  POLICE_CLEARANCE: "Police clearance certificate",
};

type Activity = { id: string; activityType: string; note: string; userId: string; createdAt: string };
type Proposal = {
  id: string; lineItems: { service: string; description?: string | null; fee: number }[];
  subtotal: number; totalFee: number; currency: string; validUntil: string;
  status: string; notes: string | null; sentAt: string | null; acceptedAt: string | null;
  invoiceId: string | null; publicToken: string | null;
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
        {!lead.member && lead.proposal?.status === "ACCEPTED" && lead.stage !== "LOST" && (
          <Button size="sm" className="h-8 text-xs text-white" style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }} onClick={convert} disabled={busy}>
            <UserPlus className="w-3.5 h-3.5 mr-1" /> Convert to member
          </Button>
        )}
      </div>

      <NextActionBanner lead={lead} onConvert={convert} onSwitchTab={setTab} />

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

  type DocItem = { id: string; fileName: string; mimeType: string; fileSize: number; documentType: string; label: string | null; uploadedAt: string; downloadUrl: string | null };
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingDocType, setPendingDocType] = useState("PASSPORT");
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // Ref so onChange can read the checklist-triggered label synchronously
  const itemLabelRef = useRef<string | null>(null);

  // Build type options from this license type's requirements, deduped
  const typeOptions = (() => {
    const reqs = getBsDocumentRequirements(lead.licenseType);
    const seen = new Set<string>();
    const opts: { type: string; label: string }[] = [];
    for (const req of reqs) {
      if (!seen.has(req.documentType)) {
        seen.add(req.documentType);
        opts.push({ type: req.documentType, label: req.documentType === "OTHER" ? "Other" : (DOC_TYPE_LABELS[req.documentType] ?? req.documentType) });
      }
    }
    if (!seen.has("OTHER")) opts.push({ type: "OTHER", label: "Other" });
    return opts;
  })();

  useEffect(() => {
    setDocsLoading(true);
    fetch(`/api/business-setup/leads/${lead.id}/documents`)
      .then((res) => res.json())
      .then((data) => setDocs(data.documents ?? []))
      .catch(() => {})
      .finally(() => setDocsLoading(false));
  }, [lead.id]);

  async function uploadDoc(file: File, docType: string) {
    setUploading(true);
    try {
      const memberId = lead.member?.id;
      if (!memberId) { toast.error("Convert lead to a member first to attach documents"); return; }
      const formData = new FormData();
      formData.append("file", file);
      formData.append("metadata", JSON.stringify({
        memberId,
        documentType: docType,
        label: pendingLabel ?? file.name.replace(/\.[^.]+$/, ""),
        businessSetupLeadId: lead.id,
      }));
      const res = await fetch("/api/documents", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Document attached");
      setPendingFile(null);
      setPendingLabel(null);
      const refreshed = await fetch(`/api/business-setup/leads/${lead.id}/documents`).then((r) => r.json());
      setDocs(refreshed.documents ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally { setUploading(false); }
  }

  function triggerUploadForItem(label: string) {
    itemLabelRef.current = label;
    fileRef.current?.click();
  }
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

        <DocumentChecklist licenseType={lead.licenseType} docs={docs} docsLoading={docsLoading} onUploadClick={() => fileRef.current?.click()} onUploadForItem={triggerUploadForItem} canUpload={!!lead.member} />
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

        <div className="dashboard-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5 text-gray-400" /> Documents
              {docs.length > 0 && <span className="text-[11px] text-gray-400 font-normal">({docs.length})</span>}
            </h2>
            <button onClick={() => fileRef.current?.click()} disabled={uploading || !lead.member || !!pendingFile}
              title={!lead.member ? "Convert lead to member first" : "Upload document"}
              className="h-7 w-7 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-40">
              <FileUp className="w-3.5 h-3.5" />
            </button>
            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  const itemLabel = itemLabelRef.current;
                  itemLabelRef.current = null;
                  if (itemLabel) {
                    // Triggered from a checklist item — lock type to OTHER and pre-set label
                    setPendingDocType("OTHER");
                    setPendingLabel(itemLabel);
                    setPendingFile(f);
                  } else {
                    const name = f.name.toLowerCase();
                    let suggested = typeOptions[0]?.type ?? "PASSPORT";
                    if (name.includes("passport")) suggested = "PASSPORT";
                    else if (name.includes("visa")) suggested = "VISA";
                    else if (name.includes("emirates") || name.includes("eid")) suggested = "EMIRATES_ID";
                    else if (name.includes("moa") || name.includes("memorandum")) suggested = "MOA";
                    else if (name.includes("ejari") || name.includes("tenancy") || name.includes("lease")) suggested = "EJARI";
                    else if (name.includes("bank")) suggested = "BANK_STATEMENT";
                    else if (name.includes("poa") || name.includes("attorney")) suggested = "POWER_OF_ATTORNEY";
                    setPendingDocType(suggested);
                    setPendingFile(f);
                  }
                }
                e.target.value = "";
              }} />
          </div>
          {pendingFile && (
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-3 space-y-2">
              <p className="text-[11px] font-medium text-gray-700 truncate">{pendingFile.name}</p>
              {pendingLabel ? (
                <p className="text-[11px] text-emerald-700 font-medium">→ {pendingLabel}</p>
              ) : (
                <Select value={pendingDocType} onValueChange={setPendingDocType}>
                  <SelectTrigger className="h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((opt) => (
                      <SelectItem key={opt.type} value={opt.type}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="flex gap-2">
                <Button size="sm" disabled={uploading} onClick={() => uploadDoc(pendingFile, pendingDocType)}
                  className="h-7 text-xs flex-1 text-white" style={{ background: "linear-gradient(135deg,#15803D,#22C55E)" }}>
                  {uploading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null} Upload
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" disabled={uploading} onClick={() => { setPendingFile(null); setPendingLabel(null); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
          {docsLoading ? (
            <p className="text-[11px] text-gray-400">Loading…</p>
          ) : docs.length === 0 ? (
            <p className="text-[11px] text-gray-400">{lead.member ? "No documents attached." : "Convert lead to member to attach documents."}</p>
          ) : (
            <div className="space-y-1.5">
              {docs.map((d) => (
                <div key={d.id} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                  <span className="text-[11px] text-gray-700 flex-1 truncate">{d.label ?? d.fileName}</span>
                  {d.downloadUrl && (
                    <a href={d.downloadUrl} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600">
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
  );
}

// ── Document completeness checklist ───────────────────────────────────────────
type DocItem = { id: string; documentType: string; label: string | null; fileName: string };
function DocumentChecklist({ licenseType, docs, docsLoading, onUploadClick, onUploadForItem, canUpload }: {
  licenseType: string;
  docs: DocItem[];
  docsLoading: boolean;
  onUploadClick: () => void;
  onUploadForItem: (label: string) => void;
  canUpload: boolean;
}) {
  const requirements = getBsDocumentRequirements(licenseType);
  if (requirements.length === 0) return null;

  const uploadedTypes = new Set(docs.map((d) => d.documentType));
  // For OTHER items: match by the exact label stored at upload time
  const uploadedOtherLabels = new Set(
    docs.filter((d) => d.documentType === "OTHER").map((d) => d.label ?? "")
  );

  const rows = requirements.map((req) => {
    if (req.documentType === "OTHER") {
      const done = uploadedOtherLabels.has(req.label);
      return { ...req, status: done ? "done" as const : "review" as const };
    }
    return { ...req, status: uploadedTypes.has(req.documentType) ? "done" as const : "missing" as const };
  });

  const required = rows.filter((r) => !r.optional);
  const detectedDone = required.filter((r) => r.status === "done").length;
  const detectable = required.filter((r) => r.documentType !== "OTHER").length;
  const pct = detectable > 0 ? Math.round((detectedDone / detectable) * 100) : 0;
  const allDone = detectable > 0 && detectedDone === detectable;

  return (
    <div className="dashboard-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        <h2 className="text-sm font-semibold text-gray-900 flex-1">Document checklist</h2>
        {allDone ? (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700">Complete</span>
        ) : (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">{detectedDone}/{detectable} detected</span>
        )}
      </div>

      {/* Progress bar */}
      {detectable > 0 && (
        <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: allDone ? "#16A34A" : "#F59E0B" }} />
        </div>
      )}

      {docsLoading ? (
        <p className="text-[11px] text-gray-400">Checking uploaded documents…</p>
      ) : (
        <div className="space-y-2">
          {rows.map((req, i) => (
            <div key={i} className="flex items-start gap-2">
              {req.status === "done" ? (
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              ) : req.status === "review" ? (
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              ) : (
                <Circle className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-[12px] leading-snug",
                  req.status === "done" ? "text-gray-400 line-through" : "text-gray-700",
                )}>
                  {req.label}
                  {req.optional && <span className="ml-1 text-gray-400 no-underline">(optional)</span>}
                </p>
                {req.status === "review" && canUpload && (
                  <button onClick={() => onUploadForItem(req.label)}
                    className="text-[10px] text-amber-500 hover:text-amber-700 mt-0.5 underline underline-offset-2 text-left">
                    Upload to mark complete
                  </button>
                )}
                {req.status === "review" && !canUpload && (
                  <p className="text-[10px] text-amber-500 mt-0.5">Upload manually to mark complete</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!canUpload ? (
        <p className="text-[11px] text-gray-400 pt-1">Convert lead to member to enable document uploads.</p>
      ) : (
        <button onClick={onUploadClick}
          className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 hover:text-emerald-700">
          <FileUp className="w-3 h-3" /> Upload a document
        </button>
      )}
    </div>
  );
}

// ── Next-action banner ────────────────────────────────────────────────────────
function NextActionBanner({ lead, onConvert, onSwitchTab }: {
  lead: Lead;
  onConvert: () => void;
  onSwitchTab: (tab: "overview" | "activity" | "proposal" | "application") => void;
}) {
  if (lead.stage === "LOST" || lead.stage === "COMPLETED") return null;

  type Action = { message: string; cta?: string; onClick?: () => void; waiting?: boolean };
  let action: Action | null = null;

  if (!lead.proposal) {
    action = { message: "Build a proposal for this client", cta: "Open Proposal", onClick: () => onSwitchTab("proposal") };
  } else if (lead.proposal.status === "DRAFT") {
    action = { message: "Proposal saved as draft — send it to the client when ready", cta: "Open Proposal", onClick: () => onSwitchTab("proposal") };
  } else if (lead.proposal.status === "SENT") {
    action = { message: "Proposal sent — waiting for client acceptance", waiting: true };
  } else if (lead.proposal.status === "REJECTED") {
    action = { message: "Proposal was rejected — revise and re-send", cta: "Open Proposal", onClick: () => onSwitchTab("proposal") };
  } else if (lead.proposal.status === "ACCEPTED") {
    if (!lead.member) {
      action = { message: "Proposal accepted — convert to member to enable document uploads and invoicing", cta: "Convert now", onClick: onConvert };
    } else if (!lead.proposal.invoiceId) {
      action = { message: "Proposal accepted — generate an invoice for this client", cta: "Open Proposal", onClick: () => onSwitchTab("proposal") };
    } else if (!lead.application) {
      action = { message: "Invoice issued — start tracking the formation application", cta: "Open Application", onClick: () => onSwitchTab("application") };
    } else if (!lead.application.referenceNumber) {
      action = { message: "Submit the application to the authority and record the reference number", cta: "Open Application", onClick: () => onSwitchTab("application") };
    } else if (!lead.application.licenseNumber) {
      action = { message: "Application submitted — waiting for authority decision", waiting: true };
    }
    // license number set → stage auto-advanced to APPROVED, "Mark won" button is visible above
  }

  if (!action) return null;

  const isWaiting = !!action.waiting;
  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm",
      isWaiting ? "bg-gray-50 border-gray-100 text-gray-600" : "bg-amber-50 border-amber-100 text-amber-900",
    )}>
      <Info className={cn("w-4 h-4 flex-shrink-0", isWaiting ? "text-gray-400" : "text-amber-500")} />
      <span className="flex-1">{action.message}</span>
      {action.cta && action.onClick && (
        <button onClick={action.onClick}
          className={cn(
            "inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors flex-shrink-0",
            isWaiting ? "border-gray-200 text-gray-600 hover:bg-gray-100" : "border-amber-200 text-amber-700 hover:bg-amber-100",
          )}>
          {action.cta} <ChevronRight className="w-3 h-3" />
        </button>
      )}
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
  const [invoiceId, setInvoiceId] = useState(p?.invoiceId ?? null);
  const [invoiceBusy, setInvoiceBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  function copyProposalLink() {
    if (!p?.publicToken) return;
    const url = `${window.location.origin}/proposals/${p.publicToken}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

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

  async function generateInvoice() {
    setInvoiceBusy(true);
    try {
      const res = await fetch(`/api/business-setup/leads/${lead.id}/invoice`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Invoice ${data.invoiceNumber} generated`);
      setInvoiceId(data.invoiceId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate invoice");
    } finally { setInvoiceBusy(false); }
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
            {p.publicToken && (
              <Button variant="outline" onClick={copyProposalLink}>
                {copied ? <Check className="w-4 h-4 mr-1.5 text-emerald-500" /> : <Link2 className="w-4 h-4 mr-1.5" />}
                {copied ? "Copied!" : "Copy link"}
              </Button>
            )}
            {p.status === "DRAFT" && <Button variant="outline" onClick={() => action("send")} disabled={busy}><Send className="w-4 h-4 mr-1.5" /> Send</Button>}
            {p.status === "SENT" && (
              <>
                <Button variant="outline" className="text-emerald-600 border-emerald-100" onClick={() => action("accept")} disabled={busy}><Check className="w-4 h-4 mr-1.5" /> Accepted</Button>
                <Button variant="outline" className="text-red-500 border-red-100" onClick={() => action("reject")} disabled={busy}>Rejected</Button>
              </>
            )}
            {p.status === "ACCEPTED" && (
              invoiceId ? (
                <Link href={`/dashboard/invoices?id=${invoiceId}`}
                  className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium ml-1">
                  <Receipt className="w-4 h-4" /> View invoice
                </Link>
              ) : (
                <Button variant="outline" onClick={generateInvoice} disabled={invoiceBusy || !lead.member}
                  title={!lead.member ? "Convert lead to member first" : undefined}>
                  {invoiceBusy ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Receipt className="w-4 h-4 mr-1.5" />}
                  Generate invoice
                </Button>
              )
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
