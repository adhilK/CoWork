"use client";

import { useState } from "react";
import { Plus, UserCheck, LogOut, Trash2, Clock, User, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { toast } from "sonner";
import { format, isToday } from "date-fns";
import { cn } from "@/lib/utils";

type Visitor = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  hostMemberId: string | null;
  purpose: string | null;
  expectedArrival: Date | null;
  checkedInAt: Date | null;
  checkedOutAt: Date | null;
  createdAt: Date;
};

type Member = { id: string; user: { name: string | null; email: string } };

type Props = {
  initialVisitors: Visitor[];
  members: Member[];
  todayCount: number;
  currentlyInCount: number;
};

function fmtTime(d: Date | null | string) {
  if (!d) return "—";
  return format(new Date(d), "HH:mm");
}

function LogVisitorDialog({ open, onClose, members, onSuccess }: {
  open: boolean;
  onClose: () => void;
  members: Member[];
  onSuccess: (v: Visitor) => void;
}) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", hostMemberId: "", purpose: "" });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/visitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, hostMemberId: form.hostMemberId || undefined }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const visitor = await res.json();
      onSuccess(visitor);
      toast.success(`${form.name} checked in`);
      setForm({ name: "", email: "", phone: "", company: "", hostMemberId: "", purpose: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to log visitor");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Log visitor</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input placeholder="John Smith" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="john@company.com" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input placeholder="+44 7700 000000" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Company</Label>
            <Input placeholder="Acme Ltd" value={form.company} onChange={(e) => setForm(f => ({ ...f, company: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Visiting member</Label>
            <Select value={form.hostMemberId} onValueChange={(v) => setForm(f => ({ ...f, hostMemberId: v ?? "" }))}>
              <SelectTrigger>
                <span className={!form.hostMemberId ? "text-muted-foreground" : ""}>
                  {form.hostMemberId
                    ? (members.find(m => m.id === form.hostMemberId)?.user.name ?? "Unknown member")
                    : "Select member (optional)"}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No specific member</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.user.name ?? m.user.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Purpose of visit</Label>
            <Input placeholder="Meeting, Delivery, Tour…" value={form.purpose} onChange={(e) => setForm(f => ({ ...f, purpose: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="text-white"
              style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
              {saving ? "Logging…" : "Check in visitor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function VisitorsView({ initialVisitors, members, todayCount, currentlyInCount }: Props) {
  const [visitors, setVisitors] = useState(initialVisitors);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function handleCheckOut(id: string) {
    try {
      const res = await fetch(`/api/visitors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkout" }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setVisitors(prev => prev.map(v => v.id === id ? { ...v, checkedOutAt: updated.checkedOutAt } : v));
      toast.success("Checked out");
    } catch {
      toast.error("Failed to check out");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this visitor log?")) return;
    try {
      await fetch(`/api/visitors/${id}`, { method: "DELETE" });
      setVisitors(prev => prev.filter(v => v.id !== id));
      toast.success("Visitor log removed");
    } catch {
      toast.error("Failed to delete");
    }
  }

  const todayVisitors = visitors.filter(v => isToday(new Date(v.createdAt)));
  const earlierVisitors = visitors.filter(v => !isToday(new Date(v.createdAt)));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Visitors</h1>
          <p className="page-subtitle">Sign-in log and visitor management</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="h-9 font-semibold text-white"
          style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
          <Plus className="w-4 h-4 mr-1.5" /> Log visitor
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="dashboard-card p-4">
          <p className="text-2xl font-bold text-gray-900">{todayCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Visitors today</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-2xl font-bold text-emerald-600">{currentlyInCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Currently on-site</p>
        </div>
      </div>

      {/* Visitor log */}
      {visitors.length === 0 ? (
        <div className="dashboard-card p-12 text-center">
          <UserCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No visitors yet</p>
          <p className="text-sm text-gray-400 mt-1">Log your first visitor with the button above.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {todayVisitors.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Today</p>
              <VisitorTable visitors={todayVisitors} members={members} onCheckOut={handleCheckOut} onDelete={handleDelete} />
            </div>
          )}
          {earlierVisitors.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Earlier</p>
              <VisitorTable visitors={earlierVisitors} members={members} onCheckOut={handleCheckOut} onDelete={handleDelete} />
            </div>
          )}
        </div>
      )}

      <LogVisitorDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        members={members}
        onSuccess={(v) => { setVisitors(prev => [v, ...prev]); setDialogOpen(false); }}
      />
    </div>
  );
}

function VisitorTable({ visitors, members, onCheckOut, onDelete }: {
  visitors: Visitor[];
  members: Member[];
  onCheckOut: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="dashboard-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Visitor</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">Host</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden sm:table-cell">Purpose</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">In</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Out</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {visitors.map((v) => {
            const host = v.hostMemberId ? members.find(m => m.id === v.hostMemberId) : null;
            const isOnSite = !!v.checkedInAt && !v.checkedOutAt;
            return (
              <tr key={v.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                      isOnSite ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                    )}>
                      {v.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{v.name}</p>
                      {v.company && <p className="text-xs text-gray-400">{v.company}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 hidden md:table-cell text-xs">
                  {host ? (host.user.name ?? host.user.email) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-gray-500 hidden sm:table-cell text-xs">
                  {v.purpose || <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1 text-xs text-gray-600">
                    <Clock className="w-3 h-3" />
                    {v.checkedInAt ? fmtTime(v.checkedInAt) : "—"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {v.checkedOutAt ? (
                    <span className="text-xs text-gray-400">{fmtTime(v.checkedOutAt)}</span>
                  ) : v.checkedInAt ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      On-site
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    {isOnSite && (
                      <button onClick={() => onCheckOut(v.id)}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors">
                        <LogOut className="w-3 h-3" /> Out
                      </button>
                    )}
                    <button onClick={() => onDelete(v.id)}
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
