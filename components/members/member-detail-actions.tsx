"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit, Trash2, Loader2, Plus, Minus, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { toast } from "sonner";
import { humanizeEnum } from "@/lib/utils";
import type { MemberStatus } from "@prisma/client";

type Plan = { id: string; name: string };

type MemberData = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  bio: string;
  notes: string;
  status: MemberStatus;
  membershipPlanId: string;
  credits: number;
};

const STATUSES: MemberStatus[] = ["ACTIVE", "PENDING", "INACTIVE", "SUSPENDED"];

export function MemberDetailActions({ member, plans }: { member: MemberData; plans: Plan[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creditBusy, setCreditBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [form, setForm] = useState({ ...member });

  async function save() {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone || null,
          company: form.company || null,
          jobTitle: form.jobTitle || null,
          bio: form.bio || null,
          notes: form.notes || null,
          status: form.status,
          membershipPlanId: form.membershipPlanId || null,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success("Member updated");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  async function adjustCredits(delta: number) {
    setCreditBusy(true);
    try {
      const res = await fetch(`/api/members/${member.id}/credits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success(delta > 0 ? `Added ${delta} credits` : `Removed ${-delta} credits`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to adjust credits");
    } finally {
      setCreditBusy(false);
    }
  }

  async function resendInvite() {
    setResendBusy(true);
    try {
      const res = await fetch(`/api/members/${member.id}/resend-invite`, { method: "POST" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success(`Invite resent to ${member.email}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resend invite");
    } finally {
      setResendBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Remove this member? They'll be marked inactive and hidden from the list.")) return;
    try {
      const res = await fetch(`/api/members/${member.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Member removed");
      router.push("/dashboard/members");
    } catch {
      toast.error("Failed to remove member");
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Credit quick-adjust */}
        <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
          <button disabled={creditBusy} onClick={() => adjustCredits(-1)}
            className="px-2 py-2 hover:bg-gray-50 text-gray-500 disabled:opacity-40" title="Deduct 1 credit">
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 text-xs font-semibold text-gray-700 min-w-[3rem] text-center">
            {member.credits} cr
          </span>
          <button disabled={creditBusy} onClick={() => adjustCredits(1)}
            className="px-2 py-2 hover:bg-gray-50 text-gray-500 disabled:opacity-40" title="Add 1 credit">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        {member.status === "PENDING" && (
          <Button
            variant="outline"
            className="h-9 text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200"
            onClick={resendInvite}
            disabled={resendBusy}
            title={`Resend invite to ${member.email}`}
          >
            {resendBusy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Mail className="w-3.5 h-3.5 mr-1.5" />
            )}
            Resend invite
          </Button>
        )}
        <Button variant="outline" className="h-9" onClick={() => { setForm({ ...member }); setOpen(true); }}>
          <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit
        </Button>
        <Button variant="outline" className="h-9 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100"
          onClick={remove}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit member</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: (v ?? "ACTIVE") as MemberStatus }))}>
                  <SelectTrigger><span>{humanizeEnum(form.status)}</span></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s} value={s}>{humanizeEnum(s)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Plan</Label>
                <Select value={form.membershipPlanId} onValueChange={(v) => setForm(f => ({ ...f, membershipPlanId: v ?? "" }))}>
                  <SelectTrigger>
                    <span className={!form.membershipPlanId ? "text-muted-foreground" : ""}>
                      {form.membershipPlanId ? (plans.find(p => p.id === form.membershipPlanId)?.name ?? "No plan") : "No plan"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No plan</SelectItem>
                    {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Company</Label>
                <Input value={form.company} onChange={(e) => setForm(f => ({ ...f, company: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Job title</Label>
              <Input value={form.jobTitle} onChange={(e) => setForm(f => ({ ...f, jobTitle: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Bio</Label>
              <Textarea rows={2} value={form.bio} onChange={(e) => setForm(f => ({ ...f, bio: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Staff notes <span className="text-gray-400 font-normal">(internal)</span></Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="text-white"
              style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
