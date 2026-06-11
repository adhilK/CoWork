"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Mail, Search, Package, CheckCircle2, Forward, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatDate, formatDateTime, humanizeEnum } from "@/lib/utils";

type Address = { id: string; addressLine: string };
type Subscription = { id: string; companyName: string; member: { user: { name: string | null; email: string } } };
type MailItem = {
  id: string;
  mailType: string;
  senderName: string | null;
  senderAddress: string | null;
  receivedAt: Date | string;
  description: string | null;
  trackingNumber: string | null;
  forwardedAt: Date | string | null;
  forwardedTo: string | null;
  collectedAt: Date | string | null;
  notifiedAt: Date | string | null;
  address: { id: string; addressLine: string };
  subscription: {
    id: string;
    companyName: string;
    member: { user: { name: string | null; email: string } };
  } | null;
};

type Props = {
  mailItems: MailItem[];
  addresses: Address[];
  subscriptions: Subscription[];
};

const MAIL_TYPES = [
  { value: "LETTER", label: "Letter", icon: "✉️" },
  { value: "PACKAGE", label: "Package", icon: "📦" },
  { value: "LEGAL_DOCUMENT", label: "Legal Document", icon: "⚖️" },
  { value: "GOVERNMENT_CORRESPONDENCE", label: "Government Correspondence", icon: "🏛️" },
  { value: "COURIER", label: "Courier", icon: "🚚" },
  { value: "OTHER", label: "Other", icon: "📄" },
];

const MAIL_ICONS: Record<string, string> = Object.fromEntries(MAIL_TYPES.map((t) => [t.value, t.icon]));

const emptyForm = {
  addressId: "",
  subscriptionId: "",
  senderName: "",
  senderAddress: "",
  receivedAt: new Date().toISOString().slice(0, 16),
  mailType: "LETTER",
  description: "",
  trackingNumber: "",
};

export function MailView({ mailItems, addresses, subscriptions }: Props) {
  const router = useRouter();
  const [logOpen, setLogOpen] = useState(false);
  const [forwardOpen, setForwardOpen] = useState<MailItem | null>(null);
  const [forwardTo, setForwardTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");

  // Filter subscriptions based on selected address
  const filteredSubs = form.addressId
    ? subscriptions.filter((s) => {
        // Would need to filter by addressId — pass all for now and let user pick
        return true;
      })
    : subscriptions;

  const filtered = mailItems.filter((m) => {
    if (filterStatus === "PENDING" && m.collectedAt) return false;
    if (filterStatus === "COLLECTED" && !m.collectedAt) return false;
    if (filterStatus === "FORWARDED" && !m.forwardedAt) return false;
    if (filterType !== "ALL" && m.mailType !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (m.senderName ?? "").toLowerCase().includes(q) ||
        (m.subscription?.companyName ?? "").toLowerCase().includes(q) ||
        (m.subscription?.member.user.name ?? "").toLowerCase().includes(q) ||
        (m.description ?? "").toLowerCase().includes(q) ||
        (m.trackingNumber ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  async function logMail() {
    if (!form.addressId) { toast.error("Select an address"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/virtual-office/mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addressId: form.addressId,
          subscriptionId: form.subscriptionId || null,
          senderName: form.senderName || null,
          senderAddress: form.senderAddress || null,
          receivedAt: form.receivedAt || undefined,
          mailType: form.mailType,
          description: form.description || null,
          trackingNumber: form.trackingNumber || null,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success("Mail item logged");
      setLogOpen(false);
      setForm({ ...emptyForm });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to log mail");
    } finally {
      setSaving(false);
    }
  }

  async function markCollected(id: string) {
    try {
      const res = await fetch(`/api/virtual-office/mail/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectedAt: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error();
      toast.success("Marked as collected");
      router.refresh();
    } catch {
      toast.error("Failed to update");
    }
  }

  async function submitForward() {
    if (!forwardOpen || !forwardTo.trim()) { toast.error("Enter a forwarding address"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/virtual-office/mail/${forwardOpen.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forwardedAt: new Date().toISOString(), forwardedTo: forwardTo }),
      });
      if (!res.ok) throw new Error();
      toast.success("Marked as forwarded");
      setForwardOpen(null);
      setForwardTo("");
      router.refresh();
    } catch {
      toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this mail log entry?")) return;
    try {
      const res = await fetch(`/api/virtual-office/mail/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Mail item removed");
      router.refresh();
    } catch {
      toast.error("Failed to remove");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Mail log</h1>
          <p className="page-subtitle">Track incoming mail and packages for virtual office clients</p>
        </div>
        <Button onClick={() => { setForm({ ...emptyForm }); setLogOpen(true); }}
          className="text-white" style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
          <Plus className="w-4 h-4 mr-1.5" /> Log mail
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input className="pl-8 h-9 text-sm" placeholder="Search sender, company..." value={search}
            onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? "ALL")}>
          <SelectTrigger className="w-[150px] h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All items</SelectItem>
            <SelectItem value="PENDING">Pending collection</SelectItem>
            <SelectItem value="COLLECTED">Collected</SelectItem>
            <SelectItem value="FORWARDED">Forwarded</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={(v) => setFilterType(v ?? "ALL")}>
          <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All types</SelectItem>
            {MAIL_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Mail items */}
      {filtered.length === 0 ? (
        <div className="dashboard-card p-12 text-center">
          <Mail className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">No mail items found</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">Log incoming mail and packages for your virtual office clients</p>
          <Button onClick={() => setLogOpen(true)} variant="outline">Log first item</Button>
        </div>
      ) : (
        <div className="dashboard-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {["Type", "Recipient", "Sender", "Received", "Tracking", "Status", ""].map((h) => (
                  <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 first:pl-5 last:pr-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((m) => {
                const collected = !!m.collectedAt;
                const forwarded = !!m.forwardedAt;
                return (
                  <tr key={m.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 pl-5">
                      <span className="text-xl">{MAIL_ICONS[m.mailType] ?? "📄"}</span>
                      <p className="text-[11px] text-gray-400 mt-0.5">{humanizeEnum(m.mailType)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{m.subscription?.companyName ?? "—"}</p>
                      <p className="text-[11px] text-gray-400">{m.subscription?.member.user.name ?? m.address.addressLine}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">{m.senderName ?? "—"}</p>
                      {m.senderAddress && <p className="text-[11px] text-gray-400 truncate max-w-[140px]">{m.senderAddress}</p>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[12px] text-gray-600">
                      {formatDate(m.receivedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[12px] text-gray-600 font-mono">{m.trackingNumber ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      {collected ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                          Collected {formatDate(m.collectedAt)}
                        </span>
                      ) : forwarded ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                          Forwarded
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 pr-5">
                      <div className="flex items-center gap-1 justify-end">
                        {!collected && !forwarded && (
                          <>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-green-600 hover:bg-green-50"
                              onClick={() => markCollected(m.id)}>
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Collected
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-blue-600 hover:bg-blue-50"
                              onClick={() => { setForwardOpen(m); setForwardTo(""); }}>
                              <Forward className="w-3 h-3 mr-1" /> Forward
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                          onClick={() => remove(m.id)}>
                          <Trash2 className="w-3 h-3" />
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

      {/* Log mail dialog */}
      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Log incoming mail</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2 max-h-[65vh] overflow-y-auto">
            <div className="space-y-1.5">
              <Label>Address *</Label>
              <Select value={form.addressId} onValueChange={(v) => setForm((f) => ({ ...f, addressId: v ?? "", subscriptionId: "" }))}>
                <SelectTrigger><SelectValue placeholder="Select address" /></SelectTrigger>
                <SelectContent>
                  {addresses.map((a) => <SelectItem key={a.id} value={a.id}>{a.addressLine}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Client / subscription <span className="text-gray-400 font-normal text-[11px]">optional</span></Label>
              <Select value={form.subscriptionId} onValueChange={(v) => setForm((f) => ({ ...f, subscriptionId: v ?? "" }))}>
                <SelectTrigger><SelectValue placeholder="Select client (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No specific client</SelectItem>
                  {subscriptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.companyName} — {s.member.user.name ?? s.member.user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Mail type</Label>
              <Select value={form.mailType} onValueChange={(v) => setForm((f) => ({ ...f, mailType: v ?? "OTHER" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MAIL_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sender name</Label>
                <Input placeholder="e.g. Emirates Post" value={form.senderName}
                  onChange={(e) => setForm((f) => ({ ...f, senderName: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Received at</Label>
                <Input type="datetime-local" value={form.receivedAt}
                  onChange={(e) => setForm((f) => ({ ...f, receivedAt: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Tracking number</Label>
              <Input placeholder="Courier tracking number" value={form.trackingNumber}
                onChange={(e) => setForm((f) => ({ ...f, trackingNumber: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={2} placeholder="Optional description..." value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogOpen(false)}>Cancel</Button>
            <Button onClick={logMail} disabled={saving} className="text-white"
              style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Log mail
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Forward dialog */}
      <Dialog open={!!forwardOpen} onOpenChange={(o) => !o && setForwardOpen(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Forward mail</DialogTitle>
          </DialogHeader>
          <div className="pt-2 space-y-3">
            <p className="text-sm text-gray-500">
              {forwardOpen?.subscription?.companyName ?? "Mail item"} — {humanizeEnum(forwardOpen?.mailType ?? "")}
            </p>
            <div className="space-y-1.5">
              <Label>Forward to address *</Label>
              <Input placeholder="e.g. PO Box 1234, Dubai" value={forwardTo}
                onChange={(e) => setForwardTo(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForwardOpen(null)}>Cancel</Button>
            <Button onClick={submitForward} disabled={saving} className="text-white"
              style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Mark forwarded
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
