"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserPlus, Loader2, Trash2, Crown, ShieldCheck, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { initials } from "@/lib/utils";
import {
  ROLE_LABELS, ROLE_DESCRIPTIONS, assignableRoles, canManageTarget, type AppRole,
} from "@/lib/permissions";

type Staff = {
  userId: string;
  name: string | null;
  email: string;
  avatar: string | null;
  role: AppRole;
  isSelf: boolean;
};

type Props = {
  actorRole: AppRole;
  actorUserId: string;
  initialStaff: Staff[];
};

const ROLE_BADGE: Record<string, { bg: string; text: string }> = {
  OWNER: { bg: "bg-amber-50", text: "text-amber-700" },
  ADMIN: { bg: "bg-indigo-50", text: "text-indigo-700" },
  MANAGER: { bg: "bg-emerald-50", text: "text-emerald-700" },
  RECEPTIONIST: { bg: "bg-sky-50", text: "text-sky-700" },
  PRO_AGENT: { bg: "bg-purple-50", text: "text-purple-700" },
};

export function TeamView({ actorRole, actorUserId, initialStaff }: Props) {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "" as "" | AppRole });
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const assignable = assignableRoles(actorRole);

  async function invite() {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!form.email.trim()) { toast.error("Email is required"); return; }
    if (!form.role) { toast.error("Select a role"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, role: form.role }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success(`Invitation sent to ${form.email}`);
      setInviteOpen(false);
      setForm({ name: "", email: "", role: "" });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to invite");
    } finally {
      setSaving(false);
    }
  }

  async function changeRole(s: Staff, role: AppRole) {
    setBusyId(s.userId);
    try {
      const res = await fetch(`/api/team/${s.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success(`${s.name ?? s.email} is now ${ROLE_LABELS[role]}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(s: Staff) {
    if (!confirm(`Remove ${s.name ?? s.email} from the team? They'll lose access immediately.`)) return;
    setBusyId(s.userId);
    try {
      const res = await fetch(`/api/team/${s.userId}`, { method: "DELETE" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success("Team member removed");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/settings" className="p-1.5 rounded-lg hover:bg-black/5">
            <ArrowLeft className="w-4 h-4 text-gray-500" />
          </Link>
          <div>
            <h1 className="page-title">Team</h1>
            <p className="page-subtitle">Invite staff and manage their access</p>
          </div>
        </div>
        {assignable.length > 0 && (
          <Button onClick={() => { setForm({ name: "", email: "", role: "" }); setInviteOpen(true); }}
            className="text-white" style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
            <UserPlus className="w-4 h-4 mr-1.5" /> Invite staff
          </Button>
        )}
      </div>

      {/* Staff list */}
      <div className="dashboard-card divide-y divide-gray-50">
        {initialStaff.map((s) => {
          const badge = ROLE_BADGE[s.role] ?? { bg: "bg-gray-100", text: "text-gray-600" };
          const manageable = !s.isSelf && canManageTarget(actorRole, s.role);
          return (
            <div key={s.userId} className="flex items-center gap-3 px-5 py-3.5">
              <Avatar className="w-9 h-9 flex-shrink-0">
                <AvatarImage src={s.avatar ?? undefined} />
                <AvatarFallback className="text-[11px] font-bold bg-emerald-100 text-emerald-700">
                  {initials(s.name ?? s.email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                  {s.name ?? s.email.split("@")[0]}
                  {s.role === "OWNER" && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                  {s.isSelf && <span className="text-[10px] font-semibold text-gray-400">(you)</span>}
                </p>
                <p className="text-[11px] text-gray-400 truncate">{s.email}</p>
              </div>

              {manageable ? (
                <Select value={s.role} onValueChange={(v) => v && v !== s.role && changeRole(s, v as AppRole)} disabled={busyId === s.userId}>
                  <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {/* Allow keeping the current role plus any the actor may assign */}
                    {Array.from(new Set([s.role, ...assignable])).map((r) => (
                      <SelectItem key={r} value={r}>{ROLE_LABELS[r as AppRole]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
                  {ROLE_LABELS[s.role]}
                </span>
              )}

              {manageable && (
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-600"
                  disabled={busyId === s.userId} onClick={() => remove(s)}>
                  {busyId === s.userId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Role reference */}
      <div className="dashboard-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Roles</h2>
        </div>
        <div className="space-y-2">
          {(["OWNER", "ADMIN", "MANAGER", "RECEPTIONIST", "PRO_AGENT"] as AppRole[]).map((r) => (
            <div key={r} className="flex items-start gap-3">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${ROLE_BADGE[r]?.bg} ${ROLE_BADGE[r]?.text}`}>
                {ROLE_LABELS[r]}
              </span>
              <p className="text-xs text-gray-500">{ROLE_DESCRIPTIONS[r]}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Invite staff member</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Full name *</Label>
              <Input placeholder="Jane Doe" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" placeholder="jane@yourspace.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: (v ?? "") as AppRole }))}>
                <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                <SelectContent>
                  {assignable.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.role && <p className="text-[11px] text-gray-400">{ROLE_DESCRIPTIONS[form.role]}</p>}
            </div>
            <p className="text-[11px] text-gray-400 inline-flex items-center gap-1">
              <Mail className="w-3 h-3" /> They'll get an email invite to set up their account.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={invite} disabled={saving} className="text-white" style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <UserPlus className="w-4 h-4 mr-1.5" />}
              Send invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
