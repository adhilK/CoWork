"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Megaphone, Loader2, ArrowLeft, Users, Send, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatDateTime, humanizeEnum } from "@/lib/utils";

type Broadcast = {
  id: string;
  name: string;
  templateName: string | null;
  content: string;
  status: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  scheduledAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

type Template = { id: string; name: string; body: string; language: string };
type Plan = { id: string; name: string };

type Props = {
  broadcasts: Broadcast[];
  templates: Template[];
  plans: Plan[];
  audienceCount: number;
};

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: "bg-gray-100", text: "text-gray-600" },
  SCHEDULED: { bg: "bg-blue-50", text: "text-blue-700" },
  SENDING: { bg: "bg-amber-50", text: "text-amber-700" },
  SENT: { bg: "bg-green-50", text: "text-green-700" },
  FAILED: { bg: "bg-red-50", text: "text-red-600" },
  CANCELLED: { bg: "bg-gray-100", text: "text-gray-400" },
};

export function BroadcastsView({ broadcasts, templates, plans, audienceCount }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"text" | "template">("text");
  const [templateName, setTemplateName] = useState("");
  const [content, setContent] = useState("");
  const [planId, setPlanId] = useState("");

  function reset() {
    setName(""); setMode("text"); setTemplateName(""); setContent(""); setPlanId("");
  }

  async function createBroadcast(sendNow: boolean) {
    if (!name.trim()) { toast.error("Name your broadcast"); return; }
    if (mode === "template" && !templateName) { toast.error("Select a template"); return; }
    if (mode === "text" && !content.trim()) { toast.error("Enter a message"); return; }
    setSending(true);
    try {
      const resolvedContent =
        mode === "template"
          ? templates.find((t) => t.name === templateName)?.body ?? content
          : content;
      const payload: any = {
        name,
        content: resolvedContent,
        sendNow,
        audienceFilter: { status: "ACTIVE", ...(planId ? { membershipPlanId: planId } : {}) },
      };
      if (mode === "template") payload.templateName = templateName;

      const res = await fetch("/api/whatsapp/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const result = await res.json();
      toast.success(sendNow ? `Broadcast sent to ${result.sentCount ?? 0} members` : "Broadcast saved as draft");
      setDialogOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create broadcast");
    } finally {
      setSending(false);
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
            <h1 className="page-title">Broadcasts</h1>
            <p className="page-subtitle">Send a message to many members at once</p>
          </div>
        </div>
        <Button onClick={() => { reset(); setDialogOpen(true); }} className="text-white"
          style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
          <Plus className="w-4 h-4 mr-1.5" /> New broadcast
        </Button>
      </div>

      <div className="dashboard-card p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(34,197,94,0.1)" }}>
          <Users className="w-4.5 h-4.5 text-emerald-600" style={{ width: 18, height: 18 }} />
        </div>
        <div>
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Reachable audience</p>
          <p className="text-sm text-gray-700"><strong>{audienceCount}</strong> active members with a WhatsApp number</p>
        </div>
      </div>

      {broadcasts.length === 0 ? (
        <div className="dashboard-card p-12 text-center">
          <Megaphone className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">No broadcasts yet</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">Announce events, closures, or offers to your members</p>
          <Button onClick={() => { reset(); setDialogOpen(true); }} variant="outline">Create first broadcast</Button>
        </div>
      ) : (
        <div className="dashboard-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {["Broadcast", "Recipients", "Sent", "Failed", "Status", "Date"].map((h) => (
                  <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 first:pl-5 last:pr-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {broadcasts.map((b) => {
                const st = STATUS_STYLES[b.status] ?? { bg: "bg-gray-100", text: "text-gray-600" };
                return (
                  <tr key={b.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 pl-5 max-w-[260px]">
                      <p className="font-medium text-gray-900 truncate">{b.name}</p>
                      <p className="text-[11px] text-gray-400 truncate">
                        {b.templateName ? `⚡ ${b.templateName}` : b.content}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{b.recipientCount}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {b.sentCount}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {b.failedCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-red-500">
                          <XCircle className="w-3.5 h-3.5" /> {b.failedCount}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>
                        {humanizeEnum(b.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 pr-5 whitespace-nowrap text-[12px] text-gray-500">
                      {formatDateTime(b.completedAt ?? b.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>New broadcast</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2 max-h-[65vh] overflow-y-auto">
            <div className="space-y-1.5">
              <Label>Broadcast name <span className="text-gray-400 font-normal text-[11px]">internal</span></Label>
              <Input placeholder="e.g. Eid closure notice" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Message type</Label>
              <div className="flex gap-2">
                <button onClick={() => setMode("text")}
                  className={`flex-1 text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${mode === "text" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-500"}`}>
                  Freeform text
                </button>
                <button onClick={() => setMode("template")}
                  className={`flex-1 text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${mode === "template" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-500"}`}>
                  Approved template
                </button>
              </div>
              <p className="text-[11px] text-gray-400">
                Freeform only reaches members who messaged you in the last 24h. Use an approved template to reach everyone.
              </p>
            </div>

            {mode === "template" ? (
              <div className="space-y-1.5">
                <Label>Template</Label>
                <Select value={templateName} onValueChange={(v) => setTemplateName(v ?? "")}>
                  <SelectTrigger><SelectValue placeholder="Select an approved template" /></SelectTrigger>
                  <SelectContent>
                    {templates.length === 0 ? (
                      <SelectItem value="" disabled>No active templates</SelectItem>
                    ) : templates.map((t) => (
                      <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {templateName && (
                  <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 mt-1 whitespace-pre-wrap">
                    {templates.find((t) => t.name === templateName)?.body}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Message</Label>
                <Textarea rows={4} placeholder="Type your announcement..." value={content}
                  onChange={(e) => setContent(e.target.value)} />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Audience <span className="text-gray-400 font-normal text-[11px]">active members with WhatsApp</span></Label>
              <Select value={planId} onValueChange={(v) => setPlanId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="All plans" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All plans</SelectItem>
                  {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => createBroadcast(false)} disabled={sending}>
              Save draft
            </Button>
            <Button onClick={() => createBroadcast(true)} disabled={sending} className="text-white"
              style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1.5" />}
              Send now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
