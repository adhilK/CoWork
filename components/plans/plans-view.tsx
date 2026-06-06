"use client";

import { useState } from "react";
import { Plus, Users, Trash2, ToggleLeft, ToggleRight, ChevronRight, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { toast } from "sonner";
import { formatCurrency, humanizeEnum, cn } from "@/lib/utils";
import type { PlanType, BillingCycle } from "@prisma/client";

type Plan = {
  id: string;
  name: string;
  description: string | null;
  type: PlanType;
  price: any;
  billingCycle: BillingCycle;
  includedCredits: number;
  meetingRoomHours: number;
  features: string[];
  isActive: boolean;
  _count: { members: number };
};

type Props = {
  initialPlans: Plan[];
  currency: string;
};

const CYCLE_LABEL: Record<BillingCycle, string> = {
  DAILY: "/day", WEEKLY: "/week", MONTHLY: "/mo", YEARLY: "/yr",
};

const TYPE_COLORS: Record<PlanType, string> = {
  DAY_PASS: "bg-orange-50 text-orange-600",
  HOT_DESK: "bg-blue-50 text-blue-600",
  DEDICATED_DESK: "bg-indigo-50 text-indigo-600",
  PRIVATE_OFFICE: "bg-purple-50 text-purple-600",
  VIRTUAL_OFFICE: "bg-teal-50 text-teal-600",
  CUSTOM: "bg-gray-100 text-gray-600",
};

function CreatePlanDialog({ open, onClose, onSuccess, currency }: {
  open: boolean; onClose: () => void; onSuccess: (p: Plan) => void; currency: string;
}) {
  const [form, setForm] = useState({
    name: "", description: "", type: "HOT_DESK" as PlanType,
    price: "", billingCycle: "MONTHLY" as BillingCycle,
    includedCredits: "0", meetingRoomHours: "0",
    featureInput: "", features: [] as string[],
  });
  const [saving, setSaving] = useState(false);

  function addFeature() {
    const f = form.featureInput.trim();
    if (f && !form.features.includes(f)) {
      setForm(prev => ({ ...prev, features: [...prev.features, f], featureInput: "" }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.price) { toast.error("Name and price required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, description: form.description,
          type: form.type, price: parseFloat(form.price),
          billingCycle: form.billingCycle,
          includedCredits: parseInt(form.includedCredits) || 0,
          meetingRoomHours: parseInt(form.meetingRoomHours) || 0,
          features: form.features,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const plan = await res.json();
      onSuccess({ ...plan, _count: { members: 0 } });
      toast.success("Plan created");
      setForm({ name: "", description: "", type: "HOT_DESK", price: "", billingCycle: "MONTHLY", includedCredits: "0", meetingRoomHours: "0", featureInput: "", features: [] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create plan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Create membership plan</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Plan name *</Label>
            <Input placeholder="Hot Desk Monthly" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v as PlanType }))}>
                <SelectTrigger>
                  <span>{humanizeEnum(form.type)}</span>
                </SelectTrigger>
                <SelectContent>
                  {["DAY_PASS","HOT_DESK","DEDICATED_DESK","PRIVATE_OFFICE","VIRTUAL_OFFICE","CUSTOM"].map(t => (
                    <SelectItem key={t} value={t}>{humanizeEnum(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Billing</Label>
              <Select value={form.billingCycle} onValueChange={(v) => setForm(f => ({ ...f, billingCycle: v as BillingCycle }))}>
                <SelectTrigger>
                  <span>{humanizeEnum(form.billingCycle)}</span>
                </SelectTrigger>
                <SelectContent>
                  {["DAILY","WEEKLY","MONTHLY","YEARLY"].map(c => (
                    <SelectItem key={c} value={c}>{humanizeEnum(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Price ({currency}) *</Label>
            <Input type="number" min="0" step="0.01" placeholder="99.00" value={form.price}
              onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Booking credits</Label>
              <Input type="number" min="0" value={form.includedCredits}
                onChange={(e) => setForm(f => ({ ...f, includedCredits: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Meeting room hours</Label>
              <Input type="number" min="0" value={form.meetingRoomHours}
                onChange={(e) => setForm(f => ({ ...f, meetingRoomHours: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Features</Label>
            <div className="flex gap-2">
              <Input placeholder="24/7 access, Mail handling…" value={form.featureInput}
                onChange={(e) => setForm(f => ({ ...f, featureInput: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFeature(); } }}
              />
              <Button type="button" variant="outline" onClick={addFeature}>Add</Button>
            </div>
            {form.features.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.features.map((f) => (
                  <span key={f} className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    {f}
                    <button type="button" onClick={() => setForm(p => ({ ...p, features: p.features.filter(x => x !== f) }))}
                      className="text-gray-400 hover:text-red-500 ml-0.5">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={2} placeholder="Optional description for members" value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="text-white"
              style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
              {saving ? "Creating…" : "Create plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PlansView({ initialPlans, currency }: Props) {
  const [plans, setPlans] = useState(initialPlans);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function toggleActive(id: string, current: boolean) {
    try {
      const res = await fetch(`/api/plans/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current }),
      });
      if (!res.ok) throw new Error();
      setPlans(prev => prev.map(p => p.id === id ? { ...p, isActive: !current } : p));
      toast.success(current ? "Plan deactivated" : "Plan activated");
    } catch {
      toast.error("Failed to update");
    }
  }

  async function deletePlan(id: string) {
    if (!confirm("Delete this plan?")) return;
    try {
      const res = await fetch(`/api/plans/${id}`, { method: "DELETE" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      setPlans(prev => prev.filter(p => p.id !== id));
      toast.success("Plan deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cannot delete plan");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Membership Plans</h1>
          <p className="text-sm text-gray-500 mt-0.5">{plans.filter(p => p.isActive).length} active plan{plans.filter(p => p.isActive).length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="h-9 font-semibold text-white"
          style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
          <Plus className="w-4 h-4 mr-1.5" /> Create plan
        </Button>
      </div>

      {plans.length === 0 ? (
        <div className="dashboard-card p-12 text-center">
          <Tag className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No plans yet</p>
          <p className="text-sm text-gray-400 mt-1">Create a membership plan to assign to members.</p>
          <Button className="mt-4 text-white" style={{ background: "#22C55E" }}
            onClick={() => setDialogOpen(true)}>Create first plan</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {plans.map((p) => (
            <div key={p.id} className={cn("dashboard-card flex flex-col overflow-hidden transition-opacity", !p.isActive && "opacity-60")}>
              <div className="h-1 w-full" style={{ background: p.isActive ? "linear-gradient(90deg, #15803D, #22C55E)" : "#e5e7eb" }} />
              <div className="p-5 flex flex-col gap-3 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wide", TYPE_COLORS[p.type])}>
                      {humanizeEnum(p.type)}
                    </span>
                    <h3 className="font-semibold text-gray-900 mt-1.5">{p.name}</h3>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(Number(p.price), currency)}</p>
                    <p className="text-xs text-gray-400">{CYCLE_LABEL[p.billingCycle]}</p>
                  </div>
                </div>

                {(p.includedCredits > 0 || p.meetingRoomHours > 0) && (
                  <div className="flex gap-2 text-xs">
                    {p.includedCredits > 0 && (
                      <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded">{p.includedCredits} credits/cycle</span>
                    )}
                    {p.meetingRoomHours > 0 && (
                      <span className="bg-purple-50 text-purple-600 px-2 py-1 rounded">{p.meetingRoomHours}h meeting rooms</span>
                    )}
                  </div>
                )}

                {p.features.length > 0 && (
                  <ul className="text-xs text-gray-500 space-y-1">
                    {p.features.slice(0, 4).map((f) => (
                      <li key={f} className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-emerald-400 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                    {p.features.length > 4 && <li className="text-gray-400">+{p.features.length - 4} more</li>}
                  </ul>
                )}

                <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Users className="w-3.5 h-3.5" /> {p._count.members} member{p._count.members !== 1 ? "s" : ""}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleActive(p.id, p.isActive)}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-gray-100 text-gray-500 transition-colors">
                      {p.isActive ? <ToggleRight className="w-3.5 h-3.5 text-emerald-500" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                      {p.isActive ? "Active" : "Inactive"}
                    </button>
                    <button onClick={() => deletePlan(p.id)}
                      className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                      title="Delete plan">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreatePlanDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={(p) => { setPlans(prev => [...prev, p]); setDialogOpen(false); }}
        currency={currency}
      />
    </div>
  );
}
