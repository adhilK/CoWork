"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, Upload, Search, ShieldCheck, AlertTriangle, Clock, Download,
  Trash2, Loader2, Plus, CheckCircle2, Inbox, Send, X, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatDate, formatRelative } from "@/lib/utils";
import {
  DOCUMENT_TYPE_GROUPS, documentTypeLabel, documentTypeGlyph, formatFileSize, expiryBucket, ALL_DOCUMENT_TYPES,
} from "@/lib/document-meta";

type Member = { id: string; name: string | null; email: string };

type Doc = {
  id: string;
  memberId: string;
  documentType: string;
  label: string | null;
  fileName: string;
  fileSize: number;
  mimeType: string;
  expiryDate: string | null;
  issueDate: string | null;
  issueCountry: string | null;
  documentNumber: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  notes: string | null;
  version: number;
  uploadedAt: string;
  member?: { id: string; name: string | null; email: string | null };
};

type DocRequest = {
  id: string;
  memberId: string;
  documentType: string;
  message: string | null;
  dueDate: string | null;
  status: string;
  createdAt: string;
  member: { id: string; name: string | null; email: string | null };
};

type Props = {
  documents: Doc[];
  members: Member[];
  requests: DocRequest[];
  stats: { total: number; expiring: number; pendingRequests: number; verified: number };
};

const EXPIRY_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  expired: { bg: "bg-red-50", text: "text-red-600", label: "Expired" },
  soon: { bg: "bg-amber-50", text: "text-amber-700", label: "Expiring soon" },
  valid: { bg: "bg-green-50", text: "text-green-700", label: "Valid" },
  none: { bg: "bg-gray-100", text: "text-gray-400", label: "No expiry" },
};

const REQUEST_BADGE: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: "bg-amber-50", text: "text-amber-700" },
  OVERDUE: { bg: "bg-red-50", text: "text-red-600" },
  FULFILLED: { bg: "bg-green-50", text: "text-green-700" },
  CANCELLED: { bg: "bg-gray-100", text: "text-gray-400" },
};

const uploadEmpty = {
  memberId: "", documentType: "PASSPORT", label: "", documentNumber: "",
  expiryDate: "", issueDate: "", issueCountry: "", notes: "", replaceDocumentId: "",
};

export function DocumentsView({ documents, members, requests, stats }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"documents" | "requests">("documents");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [memberFilter, setMemberFilter] = useState("ALL");
  const [expiryFilter, setExpiryFilter] = useState("ALL");

  // Upload dialog
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({ ...uploadEmpty });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Request dialog
  const [reqOpen, setReqOpen] = useState(false);
  const [reqForm, setReqForm] = useState({ memberId: "", documentType: "PASSPORT", message: "", dueDate: "" });
  const [reqBusy, setReqBusy] = useState(false);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const memberName = (id: string) => {
    const m = members.find((x) => x.id === id);
    return m?.name ?? m?.email ?? "Unknown";
  };

  const filtered = documents.filter((d) => {
    if (typeFilter !== "ALL" && d.documentType !== typeFilter) return false;
    if (memberFilter !== "ALL" && d.memberId !== memberFilter) return false;
    if (expiryFilter !== "ALL" && expiryBucket(d.expiryDate) !== expiryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        d.fileName.toLowerCase().includes(q) ||
        (d.label ?? "").toLowerCase().includes(q) ||
        documentTypeLabel(d.documentType).toLowerCase().includes(q) ||
        (d.member?.name ?? "").toLowerCase().includes(q) ||
        (d.member?.email ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  function openUpload(replaceDoc?: Doc) {
    if (replaceDoc) {
      setUploadForm({
        ...uploadEmpty,
        memberId: replaceDoc.memberId,
        documentType: replaceDoc.documentType,
        label: replaceDoc.label ?? "",
        replaceDocumentId: replaceDoc.id,
      });
    } else {
      setUploadForm({ ...uploadEmpty, memberId: memberFilter !== "ALL" ? memberFilter : "" });
    }
    setFile(null);
    setUploadOpen(true);
  }

  async function submitUpload() {
    if (!uploadForm.memberId) { toast.error("Select a member"); return; }
    if (!file) { toast.error("Choose a file"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("metadata", JSON.stringify({
        memberId: uploadForm.memberId,
        documentType: uploadForm.documentType,
        label: uploadForm.label || null,
        documentNumber: uploadForm.documentNumber || null,
        expiryDate: uploadForm.expiryDate || null,
        issueDate: uploadForm.issueDate || null,
        issueCountry: uploadForm.issueCountry || null,
        notes: uploadForm.notes || null,
        replaceDocumentId: uploadForm.replaceDocumentId || null,
      }));
      const res = await fetch("/api/documents", { method: "POST", body: fd });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success(uploadForm.replaceDocumentId ? "New version uploaded" : "Document uploaded");
      setUploadOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function download(doc: Doc) {
    setDownloadingId(doc.id);
    try {
      const res = await fetch(`/api/documents/${doc.id}/download`);
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const json = await res.json();
      window.open(json.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open document");
    } finally {
      setDownloadingId(null);
    }
  }

  async function toggleVerify(doc: Doc) {
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVerified: !doc.isVerified }),
      });
      if (!res.ok) throw new Error();
      toast.success(doc.isVerified ? "Marked unverified" : "Document verified");
      router.refresh();
    } catch {
      toast.error("Failed to update");
    }
  }

  async function remove(doc: Doc) {
    if (!confirm(`Delete "${doc.fileName}"? This removes the file from storage.`)) return;
    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Document deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete");
    }
  }

  async function submitRequest() {
    if (!reqForm.memberId) { toast.error("Select a member"); return; }
    setReqBusy(true);
    try {
      const res = await fetch("/api/documents/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: reqForm.memberId,
          documentType: reqForm.documentType,
          message: reqForm.message || null,
          dueDate: reqForm.dueDate || null,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success("Document requested");
      setReqOpen(false);
      setReqForm({ memberId: "", documentType: "PASSPORT", message: "", dueDate: "" });
      setTab("requests");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create request");
    } finally {
      setReqBusy(false);
    }
  }

  async function cancelRequest(id: string) {
    if (!confirm("Cancel this document request?")) return;
    try {
      const res = await fetch(`/api/documents/requests/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Request cancelled");
      router.refresh();
    } catch {
      toast.error("Failed to cancel");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Document Vault</h1>
          <p className="page-subtitle">Securely store, track, and request member documents</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-9" onClick={() => { setReqForm({ memberId: "", documentType: "PASSPORT", message: "", dueDate: "" }); setReqOpen(true); }}>
            <Send className="w-4 h-4 mr-1.5" /> Request
          </Button>
          <Button className="h-9 text-white" style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}
            onClick={() => openUpload()}>
            <Upload className="w-4 h-4 mr-1.5" /> Upload
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Documents", value: stats.total, icon: FileText, color: "#2563EB", bg: "rgba(37,99,235,0.1)" },
          { label: "Expiring ≤30d", value: stats.expiring, icon: Clock, color: "#D97706", bg: "rgba(217,119,6,0.1)" },
          { label: "Pending requests", value: stats.pendingRequests, icon: Inbox, color: "#DC2626", bg: "rgba(220,38,38,0.1)" },
          { label: "Verified", value: stats.verified, icon: ShieldCheck, color: "#15803D", bg: "rgba(21,128,61,0.1)" },
        ].map((s) => (
          <div key={s.label} className="dashboard-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
              </div>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.bg }}>
                <s.icon style={{ width: 18, height: 18, color: s.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-100">
        {([["documents", "Documents"], ["requests", "Requests"]] as const).map(([k, lbl]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === k ? "border-emerald-500 text-emerald-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {lbl}
            {k === "requests" && stats.pendingRequests > 0 && (
              <span className="ml-1.5 text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{stats.pendingRequests}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "documents" ? (
        <>
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input className="pl-8 h-9 text-sm" placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "ALL")}>
              <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                {ALL_DOCUMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{documentTypeLabel(t)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={memberFilter} onValueChange={(v) => setMemberFilter(v ?? "ALL")}>
              <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All members</SelectItem>
                {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name ?? m.email}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={expiryFilter} onValueChange={(v) => setExpiryFilter(v ?? "ALL")}>
              <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Any expiry</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="soon">Expiring soon</SelectItem>
                <SelectItem value="valid">Valid</SelectItem>
                <SelectItem value="none">No expiry</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <div className="dashboard-card p-12 text-center">
              <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">No documents found</p>
              <p className="text-xs text-gray-400 mt-1 mb-4">Upload identity, license, and company documents for your members</p>
              <Button onClick={() => openUpload()} variant="outline">Upload a document</Button>
            </div>
          ) : (
            <div className="dashboard-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Document", "Member", "Number", "Expiry", "Status", ""].map((h) => (
                      <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 first:pl-5 last:pr-5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((d) => {
                    const exp = EXPIRY_BADGE[expiryBucket(d.expiryDate)]!;
                    return (
                      <tr key={d.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 pl-5">
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg flex-shrink-0">{documentTypeGlyph(d.documentType)}</span>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900">
                                {documentTypeLabel(d.documentType)}
                                {d.version > 1 && <span className="ml-1 text-[10px] text-gray-400">v{d.version}</span>}
                              </p>
                              <p className="text-[11px] text-gray-400 truncate max-w-[180px]">
                                {d.label || d.fileName} · {formatFileSize(d.fileSize)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-gray-700">{d.member?.name ?? memberName(d.memberId)}</p>
                          <p className="text-[11px] text-gray-400">{d.member?.email}</p>
                        </td>
                        <td className="px-4 py-3 font-mono text-[12px] text-gray-600">{d.documentNumber ?? "—"}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-[12px] text-gray-600">
                          {d.expiryDate ? formatDate(d.expiryDate) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${exp.bg} ${exp.text}`}>{exp.label}</span>
                            {d.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />}
                          </div>
                        </td>
                        <td className="px-4 py-3 pr-5">
                          <div className="flex items-center gap-1 justify-end">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Download" onClick={() => download(d)} disabled={downloadingId === d.id}>
                              {downloadingId === d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="New version" onClick={() => openUpload(d)}>
                              <RefreshCw className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className={`h-7 w-7 p-0 ${d.isVerified ? "text-emerald-600" : "text-gray-400"}`} title={d.isVerified ? "Unverify" : "Verify"} onClick={() => toggleVerify(d)}>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600" title="Delete" onClick={() => remove(d)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        // Requests tab
        requests.length === 0 ? (
          <div className="dashboard-card p-12 text-center">
            <Inbox className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">No document requests</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">Request documents from members — they'll see it in their portal</p>
            <Button onClick={() => setReqOpen(true)} variant="outline">Request a document</Button>
          </div>
        ) : (
          <div className="dashboard-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Document", "Member", "Due", "Status", "Requested", ""].map((h) => (
                    <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 first:pl-5 last:pr-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {requests.map((r) => {
                  const b = REQUEST_BADGE[r.status] ?? REQUEST_BADGE.PENDING!;
                  return (
                    <tr key={r.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 pl-5">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{documentTypeGlyph(r.documentType)}</span>
                          <div>
                            <p className="font-medium text-gray-900">{documentTypeLabel(r.documentType)}</p>
                            {r.message && <p className="text-[11px] text-gray-400 max-w-[220px] truncate">{r.message}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-700">{r.member.name ?? r.member.email}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-[12px] text-gray-600">{r.dueDate ? formatDate(r.dueDate) : "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${b.bg} ${b.text}`}>{r.status}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-[12px] text-gray-500">{formatRelative(r.createdAt)}</td>
                      <td className="px-4 py-3 pr-5 text-right">
                        {(r.status === "PENDING" || r.status === "OVERDUE") && (
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-red-400 hover:text-red-600" onClick={() => cancelRequest(r.id)}>
                            <X className="w-3.5 h-3.5 mr-1" /> Cancel
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Upload dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{uploadForm.replaceDocumentId ? "Upload new version" : "Upload document"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2 max-h-[65vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Member *</Label>
                <Select value={uploadForm.memberId} onValueChange={(v) => setUploadForm((f) => ({ ...f, memberId: v ?? "" }))} disabled={!!uploadForm.replaceDocumentId}>
                  <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                  <SelectContent>
                    {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name ?? m.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Document type *</Label>
                <Select value={uploadForm.documentType} onValueChange={(v) => setUploadForm((f) => ({ ...f, documentType: v ?? "OTHER" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPE_GROUPS.map((g) => (
                      <div key={g.label}>
                        <p className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase">{g.label}</p>
                        {g.types.map((t) => <SelectItem key={t} value={t}>{documentTypeLabel(t)}</SelectItem>)}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* File picker */}
            <div className="space-y-1.5">
              <Label>File *</Label>
              <input ref={fileRef} type="file" className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <button type="button" onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 rounded-xl px-4 py-6 text-center hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors">
                {file ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                    <FileText className="w-4 h-4 text-emerald-500" />
                    {file.name} <span className="text-gray-400">({formatFileSize(file.size)})</span>
                  </div>
                ) : (
                  <div className="text-sm text-gray-400">
                    <Upload className="w-5 h-5 mx-auto mb-1 text-gray-300" />
                    Click to choose a file — PDF, image, or Word (max 20 MB)
                  </div>
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Document number <span className="text-gray-400 font-normal text-[11px]">encrypted</span></Label>
                <Input placeholder="e.g. A12345678" value={uploadForm.documentNumber}
                  onChange={(e) => setUploadForm((f) => ({ ...f, documentNumber: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Issue country</Label>
                <Input placeholder="e.g. UAE" value={uploadForm.issueCountry}
                  onChange={(e) => setUploadForm((f) => ({ ...f, issueCountry: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Issue date</Label>
                <Input type="date" value={uploadForm.issueDate}
                  onChange={(e) => setUploadForm((f) => ({ ...f, issueDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Expiry date</Label>
                <Input type="date" value={uploadForm.expiryDate}
                  onChange={(e) => setUploadForm((f) => ({ ...f, expiryDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Label / notes</Label>
              <Input placeholder="Optional label" value={uploadForm.label}
                onChange={(e) => setUploadForm((f) => ({ ...f, label: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button onClick={submitUpload} disabled={uploading} className="text-white"
              style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1.5" />}
              {uploadForm.replaceDocumentId ? "Upload version" : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request dialog */}
      <Dialog open={reqOpen} onOpenChange={setReqOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Request a document</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Member *</Label>
              <Select value={reqForm.memberId} onValueChange={(v) => setReqForm((f) => ({ ...f, memberId: v ?? "" }))}>
                <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>
                  {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name ?? m.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Document type *</Label>
              <Select value={reqForm.documentType} onValueChange={(v) => setReqForm((f) => ({ ...f, documentType: v ?? "OTHER" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPE_GROUPS.map((g) => (
                    <div key={g.label}>
                      <p className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase">{g.label}</p>
                      {g.types.map((t) => <SelectItem key={t} value={t}>{documentTypeLabel(t)}</SelectItem>)}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Message <span className="text-gray-400 font-normal text-[11px]">shown to member</span></Label>
              <Textarea rows={2} placeholder="e.g. Please upload a clear copy of your passport." value={reqForm.message}
                onChange={(e) => setReqForm((f) => ({ ...f, message: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Due date</Label>
              <Input type="date" value={reqForm.dueDate} onChange={(e) => setReqForm((f) => ({ ...f, dueDate: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReqOpen(false)}>Cancel</Button>
            <Button onClick={submitRequest} disabled={reqBusy} className="text-white"
              style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
              {reqBusy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1.5" />}
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
