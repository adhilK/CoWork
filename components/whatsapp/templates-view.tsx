"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, FileText, Edit2, Trash2, Loader2, ArrowLeft, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { humanizeEnum } from "@/lib/utils";

type Template = {
  id: string;
  name: string;
  category: string;
  language: string;
  body: string;
  variables: string[];
  status: string;
  isActive: boolean;
};

type Props = { templates: Template[] };

const CATEGORIES = [
  { value: "UTILITY", label: "Utility — transactional (confirmations, reminders)" },
  { value: "MARKETING", label: "Marketing — promotional / broadcast" },
  { value: "AUTHENTICATION", label: "Authentication — OTP / codes" },
];

const STATUSES = [
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING", label: "Pending Meta review" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: "bg-gray-100", text: "text-gray-600" },
  PENDING: { bg: "bg-amber-50", text: "text-amber-700" },
  APPROVED: { bg: "bg-green-50", text: "text-green-700" },
  REJECTED: { bg: "bg-red-50", text: "text-red-600" },
};

const emptyForm = {
  name: "",
  category: "UTILITY",
  language: "en",
  body: "",
  variablesText: "",
  status: "DRAFT",
  isActive: true,
};

function countPlaceholders(body: string): number {
  const matches = body.match(/\{\{(\d+)\}\}/g);
  if (!matches) return 0;
  return new Set(matches).size;
}

export function TemplatesView({ templates }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  }

  function openEdit(t: Template) {
    setEditing(t);
    setForm({
      name: t.name,
      category: t.category,
      language: t.language,
      body: t.body,
      variablesText: t.variables.join(", "),
      status: t.status,
      isActive: t.isActive,
    });
    setDialogOpen(true);
  }

  async function save() {
    if (!editing && !/^[a-z0-9_]+$/.test(form.name)) {
      toast.error("Name must be lowercase letters, numbers, and underscores");
      return;
    }
    if (!form.body.trim()) { toast.error("Body is required"); return; }
    setSaving(true);
    try {
      const variables = form.variablesText
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      const payload: any = {
        category: form.category,
        language: form.language,
        body: form.body,
        variables,
        status: form.status,
        isActive: form.isActive,
      };
      let url = "/api/whatsapp/templates";
      let method = "POST";
      if (editing) {
        url = `/api/whatsapp/templates/${editing.id}`;
        method = "PATCH";
      } else {
        payload.name = form.name;
      }
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success(editing ? "Template updated" : "Template created");
      setDialogOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this template?")) return;
    try {
      const res = await fetch(`/api/whatsapp/templates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Template deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete template");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/whatsapp" className="p-1.5 rounded-lg hover:bg-black/5">
            <ArrowLeft className="w-4 h-4 text-gray-500" />
          </Link>
          <div>
            <h1 className="page-title">Message templates</h1>
            <p className="page-subtitle">Reusable WhatsApp templates with {`{{1}}`} placeholders</p>
          </div>
        </div>
        <Button onClick={openCreate} className="text-white" style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
          <Plus className="w-4 h-4 mr-1.5" /> New template
        </Button>
      </div>

      <div className="dashboard-card p-4 flex items-start gap-3 bg-blue-50/40 border-blue-100">
        <Zap className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-800">
          Templates must be approved by Meta before they can be sent outside the 24-hour customer-service window.
          Create the template here matching the one in your Meta Business Manager, then set its status to <strong>Approved</strong> once Meta approves it.
        </p>
      </div>

      {templates.length === 0 ? (
        <div className="dashboard-card p-12 text-center">
          <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">No templates yet</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">Create reusable templates for confirmations, reminders, and broadcasts</p>
          <Button onClick={openCreate} variant="outline">Create first template</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((t) => {
            const st = STATUS_STYLES[t.status] ?? { bg: "bg-gray-100", text: "text-gray-600" };
            return (
              <div key={t.id} className="dashboard-card p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 font-mono truncate">{t.name}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {humanizeEnum(t.category)} · {t.language.toUpperCase()}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${st.bg} ${st.text}`}>
                    {humanizeEnum(t.status)}
                  </span>
                </div>
                <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap line-clamp-4 flex-1">
                  {t.body}
                </p>
                {t.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {t.variables.map((v, i) => (
                      <span key={i} className="text-[10px] font-medium bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">
                        {`{{${i + 1}}}`} {v}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 pt-1 border-t border-gray-50">
                  <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => openEdit(t)}>
                    <Edit2 className="w-3 h-3 mr-1" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-red-500 hover:bg-red-50 border-red-100" onClick={() => remove(t.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit template" : "New template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2 max-h-[65vh] overflow-y-auto">
            <div className="space-y-1.5">
              <Label>Template name {!editing && "*"}</Label>
              <Input
                placeholder="booking_confirmation"
                value={form.name}
                disabled={!!editing}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") }))}
              />
              <p className="text-[11px] text-gray-400">Lowercase letters, numbers, underscores. Must match the Meta template name.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v ?? "UTILITY" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Language</Label>
                <Select value={form.language} onValueChange={(v) => setForm((f) => ({ ...f, language: v ?? "en" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English (en)</SelectItem>
                    <SelectItem value="ar">Arabic (ar)</SelectItem>
                    <SelectItem value="en_US">English US (en_US)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Body *</Label>
              <Textarea rows={4} placeholder="Hi {{1}}, your booking for {{2}} is confirmed." value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
              <p className="text-[11px] text-gray-400">
                Use {`{{1}}`}, {`{{2}}`} for variables. Detected: {countPlaceholders(form.body)} placeholder(s).
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Variable labels <span className="text-gray-400 font-normal text-[11px]">comma-separated, in order</span></Label>
              <Input placeholder="member name, resource name" value={form.variablesText}
                onChange={(e) => setForm((f) => ({ ...f, variablesText: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Approval status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v ?? "DRAFT" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end pb-2">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="tplActive" checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600" />
                  <Label htmlFor="tplActive" className="cursor-pointer">Active</Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="text-white"
              style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {editing ? "Save changes" : "Create template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
