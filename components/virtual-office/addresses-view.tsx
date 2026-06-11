"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Building2, Edit2, Trash2, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatCurrency, humanizeEnum } from "@/lib/utils";

type Address = {
  id: string;
  addressLine: string;
  addressType: string;
  jurisdiction: string;
  freezoneName: string | null;
  ejariNumber: string | null;
  maxClients: number;
  isActive: boolean;
  monthlyFee: any;
  _count: { subscriptions: number };
};

type Props = { addresses: Address[]; currency: string };

const ADDRESS_TYPES = [
  { value: "MAINLAND", label: "Mainland" },
  { value: "FREEZONE", label: "Freezone" },
  { value: "OFFSHORE", label: "Offshore" },
  { value: "PREMIUM_BUSINESS_DISTRICT", label: "Premium Business District" },
];

const JURISDICTIONS = [
  { value: "UAE", label: "UAE" },
  { value: "KSA", label: "KSA" },
];

const emptyForm = {
  addressLine: "",
  addressType: "MAINLAND",
  jurisdiction: "UAE",
  freezoneName: "",
  ejariNumber: "",
  maxClients: 50,
  monthlyFee: "",
  isActive: true,
};

export function AddressesView({ addresses: initialAddresses, currency }: Props) {
  const router = useRouter();
  const [addresses, setAddresses] = useState(initialAddresses);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  }

  function openEdit(a: Address) {
    setEditing(a);
    setForm({
      addressLine: a.addressLine,
      addressType: a.addressType,
      jurisdiction: a.jurisdiction,
      freezoneName: a.freezoneName ?? "",
      ejariNumber: a.ejariNumber ?? "",
      maxClients: a.maxClients,
      monthlyFee: String(a.monthlyFee),
      isActive: a.isActive,
    });
    setDialogOpen(true);
  }

  async function save() {
    if (!form.addressLine.trim()) { toast.error("Address line is required"); return; }
    if (!form.monthlyFee || isNaN(Number(form.monthlyFee))) { toast.error("Valid monthly fee is required"); return; }
    setSaving(true);
    try {
      const payload = {
        addressLine: form.addressLine,
        addressType: form.addressType,
        jurisdiction: form.jurisdiction,
        freezoneName: form.freezoneName || null,
        ejariNumber: form.ejariNumber || null,
        maxClients: Number(form.maxClients),
        monthlyFee: Number(form.monthlyFee),
        isActive: form.isActive,
      };
      const url = editing
        ? `/api/virtual-office/addresses/${editing.id}`
        : "/api/virtual-office/addresses";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success(editing ? "Address updated" : "Address created");
      setDialogOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save address");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this address? This cannot be undone if there is active mail.")) return;
    try {
      const res = await fetch(`/api/virtual-office/addresses/${id}`, { method: "DELETE" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success("Address removed");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove address");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Addresses</h1>
          <p className="page-subtitle">Registered addresses available for virtual office subscriptions</p>
        </div>
        <Button onClick={openCreate} className="text-white" style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
          <Plus className="w-4 h-4 mr-1.5" /> Add address
        </Button>
      </div>

      {addresses.length === 0 ? (
        <div className="dashboard-card p-12 text-center">
          <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">No addresses yet</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">Add the registered addresses you offer to clients</p>
          <Button onClick={openCreate} variant="outline">Add first address</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {addresses.map((a) => (
            <div key={a.id} className="dashboard-card p-5 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(21,128,61,0.1)" }}>
                  <MapPin style={{ width: 18, height: 18, color: "#15803D" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 leading-snug">{a.addressLine}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {humanizeEnum(a.addressType)} · {a.jurisdiction}
                    {a.freezoneName && ` · ${a.freezoneName}`}
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${a.isActive ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                  {a.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Clients", value: `${a._count.subscriptions}/${a.maxClients}` },
                  { label: "Monthly fee", value: formatCurrency(a.monthlyFee, currency) },
                  { label: "Jurisdiction", value: a.jurisdiction },
                ].map((item) => (
                  <div key={item.label} className="bg-gray-50 rounded-lg py-2">
                    <p className="text-[10px] text-gray-400 font-medium">{item.label}</p>
                    <p className="text-xs font-bold text-gray-700 mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>

              {a.ejariNumber && (
                <p className="text-[11px] text-gray-400">Ejari: {a.ejariNumber}</p>
              )}

              <div className="flex items-center gap-2 pt-1 border-t border-gray-50">
                <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => openEdit(a)}>
                  <Edit2 className="w-3 h-3 mr-1" /> Edit
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-red-500 hover:bg-red-50 border-red-100" onClick={() => remove(a.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit address" : "Add address"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2 max-h-[65vh] overflow-y-auto">
            <div className="space-y-1.5">
              <Label>Address line *</Label>
              <Input
                placeholder="e.g. Office 401, Burj Al Salam, Sheikh Zayed Road, Dubai"
                value={form.addressLine}
                onChange={(e) => setForm((f) => ({ ...f, addressLine: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Address type</Label>
                <Select value={form.addressType} onValueChange={(v) => setForm((f) => ({ ...f, addressType: v ?? "MAINLAND" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ADDRESS_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Jurisdiction</Label>
                <Select value={form.jurisdiction} onValueChange={(v) => setForm((f) => ({ ...f, jurisdiction: v ?? "UAE" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {JURISDICTIONS.map((j) => <SelectItem key={j.value} value={j.value}>{j.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Freezone name <span className="text-gray-400 font-normal text-[11px]">optional</span></Label>
                <Input placeholder="e.g. DMCC, DIFC, ADGM" value={form.freezoneName}
                  onChange={(e) => setForm((f) => ({ ...f, freezoneName: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Ejari number <span className="text-gray-400 font-normal text-[11px]">UAE</span></Label>
                <Input placeholder="Ejari contract ref" value={form.ejariNumber}
                  onChange={(e) => setForm((f) => ({ ...f, ejariNumber: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Max clients</Label>
                <Input type="number" min={1} value={form.maxClients}
                  onChange={(e) => setForm((f) => ({ ...f, maxClients: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Monthly fee ({currency})</Label>
                <Input type="number" min={0} step="0.01" placeholder="0.00" value={form.monthlyFee}
                  onChange={(e) => setForm((f) => ({ ...f, monthlyFee: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isActive" checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-emerald-600" />
              <Label htmlFor="isActive" className="cursor-pointer">Active (available for new subscriptions)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="text-white"
              style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {editing ? "Save changes" : "Add address"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
