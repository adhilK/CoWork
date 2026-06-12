"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, UserCheck, LogOut, Trash2, Clock, Ban, ShieldAlert, Package, Car,
  Image as ImageIcon, Loader2, Check, Bell, ShieldX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { PhotoCapture } from "@/components/visitors/photo-capture";

type Visitor = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  hostMemberId: string | null;
  purpose: string | null;
  checkedInAt: Date | string | null;
  checkedOutAt: Date | string | null;
  createdAt: Date | string;
  nationality: string | null;
  idType: string | null;
  idNumber: string | null;
  vehiclePlate: string | null;
  photoUrl: string | null;
  isBlacklisted: boolean;
  blacklistReason: string | null;
  whatsappNotified: boolean;
};

type Member = { id: string; user: { name: string | null; email: string } };

type Delivery = {
  id: string;
  memberId: string | null;
  courierName: string | null;
  trackingNumber: string | null;
  description: string | null;
  receivedBy: string | null;
  receivedAt: Date | string;
  collectedAt: Date | string | null;
  collectedBy: string | null;
  whatsappNotified: boolean;
  member: { user: { name: string | null; email: string } } | null;
};

type Props = {
  initialVisitors: Visitor[];
  members: Member[];
  deliveries: Delivery[];
  stats: { today: number; onSite: number; blacklisted: number; pendingDeliveries: number };
};

function fmtTime(d: Date | string | null) {
  if (!d) return "—";
  return format(new Date(d), "HH:mm");
}
function fmtDateTime(d: Date | string | null) {
  if (!d) return "—";
  return format(new Date(d), "d MMM, HH:mm");
}

const ID_TYPES = ["Passport", "Emirates ID", "Iqama"];

// ─── Log visitor dialog ─────────────────────────────────────────────────────────
const emptyVisitor = {
  name: "", email: "", phone: "", company: "", hostMemberId: "", purpose: "",
  nationality: "", idType: "", idNumber: "", vehiclePlate: "",
};

function LogVisitorDialog({ open, onClose, members }: { open: boolean; onClose: () => void; members: Member[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ ...emptyVisitor });
  const [photo, setPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function reset() { setForm({ ...emptyVisitor }); setPhoto(null); }

  async function submit(override = false) {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const payload: any = {
        name: form.name, email: form.email || undefined, phone: form.phone || undefined,
        company: form.company || undefined, hostMemberId: form.hostMemberId || undefined,
        purpose: form.purpose || undefined, nationality: form.nationality || undefined,
        idType: form.idType || undefined, idNumber: form.idNumber || undefined,
        vehiclePlate: form.vehiclePlate || undefined,
        ...(override ? { overrideBlacklist: true } : {}),
      };
      const res = await fetch("/api/visitors", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (res.status === 409) {
        const e = await res.json();
        if (confirm(`${e.error}\n\nProceed anyway?`)) { setSaving(false); return submit(true); }
        setSaving(false);
        return;
      }
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const visitor = await res.json();

      // Upload photo (if captured) against the new visitor id.
      if (photo) {
        await fetch(`/api/visitors/${visitor.id}/photo`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: photo }),
        }).catch(() => { /* non-fatal */ });
      }

      toast.success(`${form.name} checked in`);
      reset();
      onClose();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to log visitor");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Log visitor</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2 max-h-[68vh] overflow-y-auto pr-1">
          <div className="flex gap-4">
            <PhotoCapture value={photo} onCapture={setPhoto} />
            <div className="flex-1 space-y-3">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input placeholder="John Smith" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Company</Label>
                <Input placeholder="Acme Ltd" value={form.company} onChange={(e) => setForm(f => ({ ...f, company: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input placeholder="+971 50 000 0000" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nationality</Label>
              <Input placeholder="e.g. Indian" value={form.nationality} onChange={(e) => setForm(f => ({ ...f, nationality: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Vehicle plate</Label>
              <Input placeholder="e.g. A 12345" value={form.vehiclePlate} onChange={(e) => setForm(f => ({ ...f, vehiclePlate: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>ID type</Label>
              <Select value={form.idType} onValueChange={(v) => setForm(f => ({ ...f, idType: v ?? "" }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {ID_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>ID number <span className="text-gray-400 font-normal text-[11px]">encrypted</span></Label>
              <Input value={form.idNumber} onChange={(e) => setForm(f => ({ ...f, idNumber: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Visiting member</Label>
              <Select value={form.hostMemberId} onValueChange={(v) => setForm(f => ({ ...f, hostMemberId: v ?? "" }))}>
                <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No specific member</SelectItem>
                  {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.user.name ?? m.user.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Purpose</Label>
              <Input placeholder="Meeting, tour…" value={form.purpose} onChange={(e) => setForm(f => ({ ...f, purpose: e.target.value }))} />
            </div>
          </div>
          {form.hostMemberId && (
            <p className="text-[11px] text-gray-400 inline-flex items-center gap-1">
              <Bell className="w-3 h-3" /> The host will be notified by WhatsApp on check-in (if they have a number).
            </p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button onClick={() => submit(false)} disabled={saving} className="text-white"
            style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Check in visitor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Log delivery dialog ─────────────────────────────────────────────────────────
function LogDeliveryDialog({ open, onClose, members }: { open: boolean; onClose: () => void; members: Member[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ memberId: "", courierName: "", trackingNumber: "", description: "", receivedBy: "" });
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      const res = await fetch("/api/deliveries", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: form.memberId || null, courierName: form.courierName || null,
          trackingNumber: form.trackingNumber || null, description: form.description || null,
          receivedBy: form.receivedBy || null,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success("Delivery logged");
      setForm({ memberId: "", courierName: "", trackingNumber: "", description: "", receivedBy: "" });
      onClose();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to log delivery");
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Log delivery</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>For member</Label>
            <Select value={form.memberId} onValueChange={(v) => setForm(f => ({ ...f, memberId: v ?? "" }))}>
              <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.user.name ?? m.user.email}</SelectItem>)}
              </SelectContent>
            </Select>
            {form.memberId && (
              <p className="text-[11px] text-gray-400 inline-flex items-center gap-1">
                <Bell className="w-3 h-3" /> The member will be notified by WhatsApp (if they have a number).
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Courier</Label>
              <Input placeholder="Aramex, DHL…" value={form.courierName} onChange={(e) => setForm(f => ({ ...f, courierName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Tracking #</Label>
              <Input value={form.trackingNumber} onChange={(e) => setForm(f => ({ ...f, trackingNumber: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input placeholder="Small box, envelope…" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Received by <span className="text-gray-400 font-normal text-[11px]">staff name</span></Label>
            <Input value={form.receivedBy} onChange={(e) => setForm(f => ({ ...f, receivedBy: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving} className="text-white" style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Log delivery
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main view ───────────────────────────────────────────────────────────────────
export function VisitorsView({ initialVisitors, members, deliveries, stats }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"visitors" | "deliveries" | "blacklist">("visitors");
  const [visitorDialog, setVisitorDialog] = useState(false);
  const [deliveryDialog, setDeliveryDialog] = useState(false);
  const [flagging, setFlagging] = useState<Visitor | null>(null);
  const [flagReason, setFlagReason] = useState("");
  const [busy, setBusy] = useState(false);

  const hostName = (id: string | null) => {
    if (!id) return null;
    const m = members.find((x) => x.id === id);
    return m?.user.name ?? m?.user.email ?? null;
  };

  async function checkOut(id: string) {
    try {
      const res = await fetch(`/api/visitors/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "checkout" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Checked out");
      router.refresh();
    } catch { toast.error("Failed to check out"); }
  }

  async function removeVisitor(id: string) {
    if (!confirm("Remove this visitor log?")) return;
    try {
      const res = await fetch(`/api/visitors/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Visitor log removed");
      router.refresh();
    } catch { toast.error("Failed to delete"); }
  }

  async function setBlacklist(v: Visitor, on: boolean, reason?: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/visitors/${v.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBlacklisted: on, blacklistReason: reason ?? null }),
      });
      if (!res.ok) throw new Error();
      toast.success(on ? "Visitor blacklisted" : "Removed from blacklist");
      setFlagging(null); setFlagReason("");
      router.refresh();
    } catch { toast.error("Failed to update"); }
    finally { setBusy(false); }
  }

  async function viewPhoto(id: string) {
    try {
      const res = await fetch(`/api/visitors/${id}/photo`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      window.open(json.url, "_blank", "noopener,noreferrer");
    } catch { toast.error("Could not load photo"); }
  }

  async function collectDelivery(id: string) {
    const by = prompt("Collected by (name)?") ?? "";
    try {
      const res = await fetch(`/api/deliveries/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "collect", collectedBy: by }),
      });
      if (!res.ok) throw new Error();
      toast.success("Marked collected");
      router.refresh();
    } catch { toast.error("Failed to update"); }
  }

  async function removeDelivery(id: string) {
    if (!confirm("Remove this delivery log?")) return;
    try {
      const res = await fetch(`/api/deliveries/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Delivery removed");
      router.refresh();
    } catch { toast.error("Failed to delete"); }
  }

  const todayVisitors = initialVisitors.filter((v) => isToday(new Date(v.createdAt)));
  const earlierVisitors = initialVisitors.filter((v) => !isToday(new Date(v.createdAt)));
  const blacklisted = initialVisitors.filter((v) => v.isBlacklisted);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Visitors & Reception</h1>
          <p className="page-subtitle">Sign-in log, deliveries, and visitor screening</p>
        </div>
        <div className="flex items-center gap-2">
          {tab === "deliveries" ? (
            <Button onClick={() => setDeliveryDialog(true)} className="h-9 text-white" style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
              <Package className="w-4 h-4 mr-1.5" /> Log delivery
            </Button>
          ) : (
            <Button onClick={() => setVisitorDialog(true)} className="h-9 text-white" style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
              <Plus className="w-4 h-4 mr-1.5" /> Log visitor
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Visitors today", value: stats.today, color: "text-gray-900" },
          { label: "On-site now", value: stats.onSite, color: "text-emerald-600" },
          { label: "Pending deliveries", value: stats.pendingDeliveries, color: "text-amber-600" },
          { label: "Blacklisted", value: stats.blacklisted, color: "text-red-500" },
        ].map((s) => (
          <div key={s.label} className="dashboard-card p-4">
            <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-100">
        {([["visitors", "Visitors"], ["deliveries", "Deliveries"], ["blacklist", "Blacklist"]] as const).map(([k, lbl]) => (
          <button key={k} onClick={() => setTab(k)}
            className={cn("px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === k ? "border-emerald-500 text-emerald-700" : "border-transparent text-gray-500 hover:text-gray-700")}>
            {lbl}
            {k === "deliveries" && stats.pendingDeliveries > 0 && (
              <span className="ml-1.5 text-[10px] font-bold bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">{stats.pendingDeliveries}</span>
            )}
            {k === "blacklist" && stats.blacklisted > 0 && (
              <span className="ml-1.5 text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{stats.blacklisted}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Visitors tab ── */}
      {tab === "visitors" && (
        initialVisitors.length === 0 ? (
          <Empty icon={UserCheck} title="No visitors yet" hint="Log your first visitor with the button above." />
        ) : (
          <div className="space-y-5">
            {todayVisitors.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Today</p>
                <VisitorTable visitors={todayVisitors} hostName={hostName} onCheckOut={checkOut} onDelete={removeVisitor}
                  onFlag={(v) => { setFlagging(v); setFlagReason(""); }} onPhoto={viewPhoto} />
              </div>
            )}
            {earlierVisitors.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Earlier</p>
                <VisitorTable visitors={earlierVisitors} hostName={hostName} onCheckOut={checkOut} onDelete={removeVisitor}
                  onFlag={(v) => { setFlagging(v); setFlagReason(""); }} onPhoto={viewPhoto} />
              </div>
            )}
          </div>
        )
      )}

      {/* ── Deliveries tab ── */}
      {tab === "deliveries" && (
        deliveries.length === 0 ? (
          <Empty icon={Package} title="No deliveries logged" hint="Log a package or mail received at reception." />
        ) : (
          <div className="dashboard-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["For", "Courier", "Tracking", "Received", "Status", ""].map((h) => (
                    <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 first:pl-5 last:pr-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {deliveries.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 pl-5">
                      <p className="font-medium text-gray-900">{d.member?.user.name ?? d.member?.user.email ?? "Unassigned"}</p>
                      {d.description && <p className="text-[11px] text-gray-400">{d.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{d.courierName ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-gray-500">{d.trackingNumber ?? "—"}</td>
                    <td className="px-4 py-3 text-[12px] text-gray-500">{fmtDateTime(d.receivedAt)}</td>
                    <td className="px-4 py-3">
                      {d.collectedAt ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                          Collected {fmtDateTime(d.collectedAt)}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
                          {d.whatsappNotified ? "Awaiting collection · notified" : "Awaiting collection"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 pr-5">
                      <div className="flex items-center gap-1 justify-end">
                        {!d.collectedAt && (
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-green-600 hover:bg-green-50" onClick={() => collectDelivery(d.id)}>
                            <Check className="w-3.5 h-3.5 mr-1" /> Collected
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600" onClick={() => removeDelivery(d.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── Blacklist tab ── */}
      {tab === "blacklist" && (
        blacklisted.length === 0 ? (
          <Empty icon={ShieldAlert} title="Blacklist is empty" hint="Flag a visitor from the Visitors tab to add them here." />
        ) : (
          <div className="dashboard-card divide-y divide-gray-50">
            {blacklisted.map((v) => (
              <div key={v.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                  <ShieldX className="w-4 h-4 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{v.name}{v.company ? ` · ${v.company}` : ""}</p>
                  <p className="text-[11px] text-gray-400">
                    {v.blacklistReason ? v.blacklistReason : "No reason given"}{v.phone ? ` · ${v.phone}` : ""}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="h-8 text-xs" disabled={busy} onClick={() => setBlacklist(v, false)}>
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )
      )}

      <LogVisitorDialog open={visitorDialog} onClose={() => setVisitorDialog(false)} members={members} />
      <LogDeliveryDialog open={deliveryDialog} onClose={() => setDeliveryDialog(false)} members={members} />

      {/* Blacklist reason dialog */}
      <Dialog open={!!flagging} onOpenChange={(o) => !o && setFlagging(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Blacklist visitor</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-sm text-gray-600">
              Flag <strong>{flagging?.name}</strong>. Future check-ins matching this name or phone will be warned.
            </p>
            <div className="space-y-1.5">
              <Label>Reason <span className="text-gray-400 font-normal text-[11px]">optional</span></Label>
              <Textarea rows={2} placeholder="e.g. Repeated no-show, security incident…" value={flagReason} onChange={(e) => setFlagReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlagging(null)}>Cancel</Button>
            <Button className="text-white bg-red-600 hover:bg-red-700" disabled={busy}
              onClick={() => flagging && setBlacklist(flagging, true, flagReason || undefined)}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Ban className="w-4 h-4 mr-1.5" />} Blacklist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Empty({ icon: Icon, title, hint }: { icon: any; title: string; hint: string }) {
  return (
    <div className="dashboard-card p-12 text-center">
      <Icon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500 font-medium">{title}</p>
      <p className="text-sm text-gray-400 mt-1">{hint}</p>
    </div>
  );
}

function VisitorTable({ visitors, hostName, onCheckOut, onDelete, onFlag, onPhoto }: {
  visitors: Visitor[];
  hostName: (id: string | null) => string | null;
  onCheckOut: (id: string) => void;
  onDelete: (id: string) => void;
  onFlag: (v: Visitor) => void;
  onPhoto: (id: string) => void;
}) {
  return (
    <div className="dashboard-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Visitor</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">Host</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden lg:table-cell">Vehicle</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">In</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Out</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {visitors.map((v) => {
            const isOnSite = !!v.checkedInAt && !v.checkedOutAt;
            return (
              <tr key={v.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => v.photoUrl && onPhoto(v.id)}
                      className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 relative",
                        isOnSite ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500",
                        v.photoUrl ? "ring-2 ring-emerald-300 cursor-pointer" : "")}
                      title={v.photoUrl ? "View photo" : undefined}>
                      {v.name.charAt(0).toUpperCase()}
                      {v.photoUrl && <ImageIcon className="w-2.5 h-2.5 absolute -bottom-0.5 -right-0.5 text-emerald-600 bg-white rounded-full" />}
                    </button>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 flex items-center gap-1.5">
                        {v.name}
                        {v.isBlacklisted && <Ban className="w-3.5 h-3.5 text-red-500" />}
                      </p>
                      <p className="text-xs text-gray-400">
                        {[v.company, v.nationality, v.idType].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 hidden md:table-cell text-xs">
                  {hostName(v.hostMemberId) ?? <span className="text-gray-300">—</span>}
                  {v.whatsappNotified && <span className="ml-1 text-emerald-500" title="Host notified">✓</span>}
                </td>
                <td className="px-4 py-3 text-gray-500 hidden lg:table-cell text-xs">
                  {v.vehiclePlate ? <span className="inline-flex items-center gap-1"><Car className="w-3 h-3" />{v.vehiclePlate}</span> : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1 text-xs text-gray-600"><Clock className="w-3 h-3" />{fmtTime(v.checkedInAt)}</span>
                </td>
                <td className="px-4 py-3">
                  {v.checkedOutAt ? (
                    <span className="text-xs text-gray-400">{fmtTime(v.checkedOutAt)}</span>
                  ) : isOnSite ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> On-site
                    </span>
                  ) : <span className="text-xs text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    {isOnSite && (
                      <button onClick={() => onCheckOut(v.id)}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors">
                        <LogOut className="w-3 h-3" /> Out
                      </button>
                    )}
                    {!v.isBlacklisted && (
                      <button onClick={() => onFlag(v)} title="Blacklist"
                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={() => onDelete(v.id)} title="Remove"
                      className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
