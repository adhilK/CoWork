"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users, Edit2, Trash2, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatCurrency, formatDate, humanizeEnum } from "@/lib/utils";

type Member = { id: string; user: { name: string | null; email: string }; company: string | null };
type Address = { id: string; addressLine: string; addressType: string; monthlyFee: any };
type Subscription = {
  id: string;
  companyName: string;
  licenseNumber: string | null;
  licenseExpiry: Date | string | null;
  startDate: Date | string;
  endDate: Date | string | null;
  renewalDate: Date | string | null;
  status: string;
  monthlyFee: any;
  currency: string;
  notes: string | null;
  member: { user: { name: string | null; email: string } };
  address: { id: string; addressLine: string; addressType: string };
};

type Props = {
  subscriptions: Subscription[];
  members: Member[];
  addresses: Address[];
  currency: string;
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  ACTIVE: { bg: "bg-green-50", text: "text-green-700", label: "Active" },
  PENDING_RENEWAL: { bg: "bg-amber-50", text: "text-amber-700", label: "Renewal Due" },
  EXPIRED: { bg: "bg-red-50", text: "text-red-600", label: "Expired" },
  CANCELLED: { bg: "bg-gray-100", text: "text-gray-500", label: "Cancelled" },
};

const STATUSES = ["ACTIVE", "PENDING_RENEWAL", "EXPIRED", "CANCELLED"];

const emptyForm = {
  memberId: "",
  addressId: "",
  companyName: "",
  licenseNumber: "",
  licenseExpiry: "",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
  renewalDate: "",
  monthlyFee: "",
  currency: "AED",
  notes: "",
  status: "ACTIVE",
};

export function SubscriptionsView({ subscriptions, members, addresses, currency }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm, currency });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filtered = subscriptions.filter((s) => {
    if (statusFilter !== "ALL" && s.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.companyName.toLowerCase().includes(q) ||
        (s.member.user.name ?? "").toLowerCase().includes(q) ||
        s.member.user.email.toLowerCase().includes(q) ||
        (s.licenseNumber ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, currency });
    setDialogOpen(true);
  }

  function openEdit(s: Subscription) {
    setEditing(s);
    setForm({
      memberId: s.member.user.email, // not needed for edit
      addressId: s.address.id,
      companyName: s.companyName,
      licenseNumber: s.licenseNumber ?? "",
      licenseExpiry: s.licenseExpiry ? new Date(s.licenseExpiry).toISOString().slice(0, 10) : "",
      startDate: new Date(s.startDate).toISOString().slice(0, 10),
      endDate: s.endDate ? new Date(s.endDate).toISOString().slice(0, 10) : "",
      renewalDate: s.renewalDate ? new Date(s.renewalDate).toISOString().slice(0, 10) : "",
      monthlyFee: String(s.monthlyFee),
      currency: s.currency,
      notes: s.notes ?? "",
      status: s.status,
    });
    setDialogOpen(true);
  }

  async function save() {
    if (!editing && !form.memberId) { toast.error("Select a member"); return; }
    if (!editing && !form.addressId) { toast.error("Select an address"); return; }
    if (!form.companyName.trim()) { toast.error("Company name is required"); return; }
    if (!form.monthlyFee || isNaN(Number(form.monthlyFee))) { toast.error("Valid monthly fee is required"); return; }
    setSaving(true);
    try {
      let payload: Record<string, any>;
      let url: string;
      let method: string;
      if (editing) {
        payload = {
          companyName: form.companyName,
          licenseNumber: form.licenseNumber || null,
          licenseExpiry: form.licenseExpiry || null,
          startDate: form.startDate,
          endDate: form.endDate || null,
          renewalDate: form.renewalDate || null,
          monthlyFee: Number(form.monthlyFee),
          currency: form.currency,
          notes: form.notes || null,
          status: form.status,
        };
        url = `/api/virtual-office/subscriptions/${editing.id}`;
        method = "PATCH";
      } else {
        payload = {
          memberId: form.memberId,
          addressId: form.addressId,
          companyName: form.companyName,
          licenseNumber: form.licenseNumber || null,
          licenseExpiry: form.licenseExpiry || null,
          startDate: form.startDate,
          endDate: form.endDate || null,
          renewalDate: form.renewalDate || null,
          monthlyFee: Number(form.monthlyFee),
          currency: form.currency,
          notes: form.notes || null,
        };
        url = "/api/virtual-office/subscriptions";
        method = "POST";
      }
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success(editing ? "Subscription updated" : "Subscription created");
      setDialogOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Cancel this virtual office subscription?")) return;
    try {
      const res = await fetch(`/api/virtual-office/subscriptions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Subscription cancelled");
      router.refresh();
    } catch {
      toast.error("Failed to cancel subscription");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Subscriptions</h1>
          <p className="page-subtitle">Virtual office clients and their registered address subscriptions</p>
        </div>
        <Button onClick={openCreate} className="text-white" style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
          <Plus className="w-4 h-4 mr-1.5" /> New subscription
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input className="pl-8 h-9 text-sm" placeholder="Search company, member..." value={search}
            onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "ALL")}>
          <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_STYLES[s]?.label ?? humanizeEnum(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="dashboard-card p-12 text-center">
          <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">No subscriptions found</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">Assign members to registered addresses</p>
          <Button onClick={openCreate} variant="outline">New subscription</Button>
        </div>
      ) : (
        <div className="dashboard-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {["Company", "Member", "Address", "Monthly fee", "Renewal", "Status", ""].map((h) => (
                  <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 first:pl-5 last:pr-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((s) => {
                const st = STATUS_STYLES[s.status] ?? { bg: "bg-gray-100", text: "text-gray-500", label: humanizeEnum(s.status) };
                return (
                  <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 pl-5">
                      <p className="font-medium text-gray-900">{s.companyName}</p>
                      {s.licenseNumber && <p className="text-[11px] text-gray-400 mt-0.5">Lic: {s.licenseNumber}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">{s.member.user.name ?? "—"}</p>
                      <p className="text-[11px] text-gray-400">{s.member.user.email}</p>
                    </td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <p className="text-gray-700 truncate text-[12px]">{s.address.addressLine}</p>
                      <p className="text-[11px] text-gray-400">{humanizeEnum(s.address.addressType)}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                      {formatCurrency(s.monthlyFee, s.currency)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[12px] text-gray-600">
                      {s.renewalDate ? formatDate(s.renewalDate) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 pr-5">
                      <div className="flex items-center gap-1 justify-end">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(s)}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600" onClick={() => remove(s.id)}>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit subscription" : "New virtual office subscription"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2 max-h-[65vh] overflow-y-auto">
            {!editing && (
              <>
                <div className="space-y-1.5">
                  <Label>Member *</Label>
                  <Select value={form.memberId} onValueChange={(v) => setForm((f) => ({ ...f, memberId: v ?? "" }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select member" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.user.name ?? m.user.email}{m.company ? ` (${m.company})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Address *</Label>
                  <Select value={form.addressId} onValueChange={(v) => {
                    const addr = addresses.find((a) => a.id === (v ?? ""));
                    setForm((f) => ({ ...f, addressId: v ?? "", monthlyFee: addr ? String(addr.monthlyFee) : f.monthlyFee }));
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select address" />
                    </SelectTrigger>
                    <SelectContent>
                      {addresses.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.addressLine} ({humanizeEnum(a.addressType)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label>Company name *</Label>
              <Input placeholder="e.g. Acme Trading LLC" value={form.companyName}
                onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>License number</Label>
                <Input placeholder="Commercial license no." value={form.licenseNumber}
                  onChange={(e) => setForm((f) => ({ ...f, licenseNumber: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>License expiry</Label>
                <Input type="date" value={form.licenseExpiry}
                  onChange={(e) => setForm((f) => ({ ...f, licenseExpiry: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start date</Label>
                <Input type="date" value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Renewal date</Label>
                <Input type="date" value={form.renewalDate}
                  onChange={(e) => setForm((f) => ({ ...f, renewalDate: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Monthly fee</Label>
                <Input type="number" min={0} step="0.01" placeholder="0.00" value={form.monthlyFee}
                  onChange={(e) => setForm((f) => ({ ...f, monthlyFee: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={(v) => setForm((f) => ({ ...f, currency: v ?? "AED" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AED">AED</SelectItem>
                    <SelectItem value="SAR">SAR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {editing && (
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v ?? "ACTIVE" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_STYLES[s]?.label ?? humanizeEnum(s)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Notes <span className="text-gray-400 font-normal text-[11px]">internal</span></Label>
              <Textarea rows={2} placeholder="Internal notes..." value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="text-white"
              style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {editing ? "Save changes" : "Create subscription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
