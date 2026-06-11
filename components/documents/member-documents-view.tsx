"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, Upload, Download, Loader2, ShieldCheck, Clock, Inbox, Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import {
  DOCUMENT_TYPE_GROUPS, documentTypeLabel, documentTypeGlyph, formatFileSize, expiryBucket,
} from "@/lib/document-meta";

type Doc = {
  id: string;
  documentType: string;
  label: string | null;
  fileName: string;
  fileSize: number;
  expiryDate: string | null;
  documentNumber: string | null;
  isVerified: boolean;
  version: number;
  uploadedAt: string;
};

type DocRequest = {
  id: string;
  documentType: string;
  message: string | null;
  dueDate: string | null;
  status: string;
};

type Props = { documents: Doc[]; requests: DocRequest[] };

const EXPIRY_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  expired: { bg: "bg-red-50", text: "text-red-600", label: "Expired" },
  soon: { bg: "bg-amber-50", text: "text-amber-700", label: "Expiring soon" },
  valid: { bg: "bg-green-50", text: "text-green-700", label: "Valid" },
  none: { bg: "bg-gray-100", text: "text-gray-400", label: "No expiry" },
};

const uploadEmpty = { documentType: "PASSPORT", label: "", documentNumber: "", expiryDate: "", issueDate: "" };

export function MemberDocumentsView({ documents, requests }: Props) {
  const router = useRouter();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [form, setForm] = useState({ ...uploadEmpty });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function openUpload(forType?: string) {
    setForm({ ...uploadEmpty, documentType: forType ?? "PASSPORT" });
    setFile(null);
    setUploadOpen(true);
  }

  async function submitUpload() {
    if (!file) { toast.error("Choose a file"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("metadata", JSON.stringify({
        documentType: form.documentType,
        label: form.label || null,
        documentNumber: form.documentNumber || null,
        expiryDate: form.expiryDate || null,
        issueDate: form.issueDate || null,
      }));
      const res = await fetch("/api/documents", { method: "POST", body: fd });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success("Document uploaded");
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Documents</h1>
          <p className="text-sm text-gray-500 mt-0.5">Upload and manage your identity and company documents</p>
        </div>
        <Button onClick={() => openUpload()} className="text-white" style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
          <Upload className="w-4 h-4 mr-1.5" /> Upload
        </Button>
      </div>

      {/* Pending requests */}
      {requests.length > 0 && (
        <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-amber-600" />
            <p className="text-sm font-semibold text-amber-800">Documents requested from you</p>
          </div>
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-amber-100">
                <span className="text-lg">{documentTypeGlyph(r.documentType)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{documentTypeLabel(r.documentType)}</p>
                  {r.message && <p className="text-[11px] text-gray-500">{r.message}</p>}
                  <p className="text-[11px] mt-0.5">
                    {r.status === "OVERDUE"
                      ? <span className="text-red-600 font-semibold">Overdue{r.dueDate ? ` — was due ${formatDate(r.dueDate)}` : ""}</span>
                      : r.dueDate ? <span className="text-amber-600">Due {formatDate(r.dueDate)}</span> : <span className="text-gray-400">No due date</span>}
                  </p>
                </div>
                <Button size="sm" className="h-8 text-white flex-shrink-0" style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}
                  onClick={() => openUpload(r.documentType)}>
                  <Upload className="w-3.5 h-3.5 mr-1" /> Upload
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents */}
      {documents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">No documents yet</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">Upload your passport, visa, Emirates ID, or company documents</p>
          <Button onClick={() => openUpload()} variant="outline">Upload your first document</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {documents.map((d) => {
            const exp = EXPIRY_BADGE[expiryBucket(d.expiryDate)]!;
            return (
              <div key={d.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 text-xl">
                  {documentTypeGlyph(d.documentType)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{documentTypeLabel(d.documentType)}</p>
                    {d.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                    {d.version > 1 && <span className="text-[10px] text-gray-400">v{d.version}</span>}
                  </div>
                  <p className="text-[11px] text-gray-400 truncate">{d.label || d.fileName} · {formatFileSize(d.fileSize)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${exp.bg} ${exp.text}`}>
                      {d.expiryDate ? `${exp.label} · ${formatDate(d.expiryDate)}` : exp.label}
                    </span>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0 flex-shrink-0" title="Download" onClick={() => download(d)} disabled={downloadingId === d.id}>
                  {downloadingId === d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Upload document</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Document type *</Label>
              <Select value={form.documentType} onValueChange={(v) => setForm((f) => ({ ...f, documentType: v ?? "OTHER" }))}>
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
                <Label>Document number</Label>
                <Input placeholder="Optional" value={form.documentNumber}
                  onChange={(e) => setForm((f) => ({ ...f, documentNumber: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Expiry date</Label>
                <Input type="date" value={form.expiryDate}
                  onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button onClick={submitUpload} disabled={uploading} className="text-white"
              style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1.5" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
