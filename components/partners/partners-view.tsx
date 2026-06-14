"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Handshake, Plus, Loader2, Edit2, Trash2, Users, TrendingUp, Wallet, CheckCircle2,
  Search, Trophy, BadgeDollarSign, Ban, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

type Partner = {
  id: string; name: string; companyName: string | null; type: string; email: string | null;
  phone: string | null; whatsapp: string | null; commissionType: string; commissionRate: number;
  currency: string; notes: string | null; isActive: boolean; hasPayoutDetails: boolean;
  referralCount: number; commissionEarned: number; commissionPaid: number; commissionOutstanding: number;
};
type Referral = {
  id: string; partnerId: string; partnerName: string; clientName: string; clientPhone: string | null;
  clientEmail: string | null; serviceDescription: string | null; leadId: string | null; status: string;
  dealValue: number | null; commissionAmount: number | null; currency: string; payoutReference: string | null;
  convertedAt: string | null; paidAt: string | null; createdAt: string;
};
type Props = { partners: Partner[]; referrals: Referral[]; currency: string };

const TYPE_LABELS: Record<string, string> = { INDIVIDUAL: "Individual", COMPANY: "Company", AGENCY: "Agency", FREELANCER: "Freelancer", OTHER: "Other" };
const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  PENDING: { label: "Pending", bg: "bg-amber-50", text: "text-amber-700" },
  CONVERTED: { label: "Converted", bg: "bg-blue-50", text: "text-blue-700" },
  PAID: { label: "Paid", bg: "bg-green-50", text: "text-green-700" },
  CANCELLED: { label: "Cancelled", bg: "bg-gray-100", text: "text-gray-400" },
};

const emptyPartner = {
  name: "", companyName: "", type: "INDIVIDUAL", email: "", phone: "", whatsapp: "",
  commissionType: "PERCENTAGE", commissionRate: "10", currency: "AED", payoutDetails: "", notes: "", isActive: true,
};

export function PartnersView({ partners, referrals, currency }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"partners" | "referrals">("partners");

  // partner dialog
  const [pOpen, setPOpen] = useState(false);
  const [editingP, setEditingP] = useState<Partner | null>(null);
  const [pForm, setPForm] = useState({ ...emptyPartner, currency });
  const [pSaving, setPSaving] = useState(false);

  // referral dialog
  const [rOpen, setROpen] = useState(false);
  const [rForm, setRForm] = useState({ partnerId: "", clientName: "", clientPhone: "", clientEmail: "", serviceDescription: "", createLead: false });
  const [rSaving, setRSaving] = useState(false);

  // convert / pay dialogs
  const [convertRef, setConvertRef] = useState<Referral | null>(null);
  const [dealValue, setDealValue] = useState("");
  const [commission, setCommission] = useState("");
  const [payRef, setPayRef] = useState<Referral | null>(null);
  const [payReference, setPayReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");

  const totalReferrals = referrals.length;
  const payable = referrals.filter((r) => r.status === "CONVERTED").reduce((s, r) => s + (r.commissionAmount ?? 0), 0);
  const paid = referrals.filter((r) => r.status === "PAID").reduce((s, r) => s + (r.commissionAmount ?? 0), 0);
  const activePartners = partners.filter((p) => p.isActive).length;

  function previewCommission(partnerId: string, deal: number): number {
    const p = partners.find((x) => x.id === partnerId);
    if (!p) return 0;
    if (p.commissionType === "FIXED") return p.commissionRate;
    return Math.round((deal * p.commissionRate) / 100 * 100) / 100;
  }

  // ── Partner CRUD ──
  function openCreateP() { setEditingP(null); setPForm({ ...emptyPartner, currency }); setPOpen(true); }
  async function openEditP(p: Partner) {
    setEditingP(p);
    let payoutDetails = "";
    try { const res = await fetch(`/api/partners/${p.id}`); if (res.ok) payoutDetails = (await res.json()).payoutDetails ?? ""; } catch {}
    setPForm({
      name: p.name, companyName: p.companyName ?? "", type: p.type, email: p.email ?? "", phone: p.phone ?? "",
      whatsapp: p.whatsapp ?? "", commissionType: p.commissionType, commissionRate: String(p.commissionRate),
      currency: p.currency, payoutDetails, notes: p.notes ?? "", isActive: p.isActive,
    });
    setPOpen(true);
  }
  async function saveP() {
    if (!pForm.name.trim()) { toast.error("Name is required"); return; }
    setPSaving(true);
    try {
      const payload = {
        name: pForm.name, companyName: pForm.companyName || null, type: pForm.type,
        email: pForm.email || null, phone: pForm.phone || null, whatsapp: pForm.whatsapp || null,
        commissionType: pForm.commissionType, commissionRate: Number(pForm.commissionRate) || 0,
        currency: pForm.currency, payoutDetails: pForm.payoutDetails || null, notes: pForm.notes || null, isActive: pForm.isActive,
      };
      const url = editingP ? `/api/partners/${editingP.id}` : "/api/partners";
      const res = await fetch(url, { method: editingP ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success(editingP ? "Partner updated" : "Partner added");
      setPOpen(false); router.refresh();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setPSaving(false); }
  }
  async function removeP(p: Partner) {
    if (!confirm(`Remove ${p.name}? Their referrals are removed too.`)) return;
    try { const res = await fetch(`/api/partners/${p.id}`, { method: "DELETE" }); if (!res.ok) throw new Error(); toast.success("Partner removed"); router.refresh(); }
    catch { toast.error("Failed to remove"); }
  }

  // ── Referral actions ──
  async function createReferral() {
    if (!rForm.partnerId) { toast.error("Select a partner"); return; }
    if (!rForm.clientName.trim()) { toast.error("Client name is required"); return; }
    setRSaving(true);
    try {
      const res = await fetch("/api/referrals", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId: rForm.partnerId, clientName: rForm.clientName, clientPhone: rForm.clientPhone || null,
          clientEmail: rForm.clientEmail || null, serviceDescription: rForm.serviceDescription || null, createLead: rForm.createLead,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success(rForm.createLead ? "Referral + lead created" : "Referral added");
      setROpen(false); setRForm({ partnerId: "", clientName: "", clientPhone: "", clientEmail: "", serviceDescription: "", createLead: false }); router.refresh();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setRSaving(false); }
  }
  async function refAction(id: string, payload: any, msg: string) {
    setBusy(true);
    try { const res = await fetch(`/api/referrals/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); if (!res.ok) { const e = await res.json(); throw new Error(e.error); } toast.success(msg); router.refresh(); return true; }
    catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); return false; }
    finally { setBusy(false); }
  }
  async function removeRef(id: string) {
    if (!confirm("Remove this referral?")) return;
    try { const res = await fetch(`/api/referrals/${id}`, { method: "DELETE" }); if (!res.ok) throw new Error(); toast.success("Referral removed"); router.refresh(); }
    catch { toast.error("Failed"); }
  }

  const filteredRefs = referrals.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.clientName.toLowerCase().includes(q) || r.partnerName.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Partners</h1>
          <p className="page-subtitle">Referral partners and commission tracking</p>
        </div>
        {tab === "partners" ? (
          <Button onClick={openCreateP} className="text-white" style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
            <Plus className="w-4 h-4 mr-1.5" /> Add partner
          </Button>
        ) : (
          <Button onClick={() => setROpen(true)} disabled={partners.length === 0} className="text-white" style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
            <Plus className="w-4 h-4 mr-1.5" /> Log referral
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active partners", value: String(activePartners), icon: Users, color: "#2563EB", bg: "rgba(37,99,235,0.1)" },
          { label: "Referrals", value: String(totalReferrals), icon: TrendingUp, color: "#7C3AED", bg: "rgba(124,58,237,0.1)" },
          { label: "Commission payable", value: formatCurrency(payable, currency), icon: Wallet, color: "#D97706", bg: "rgba(217,119,6,0.1)" },
          { label: "Commission paid", value: formatCurrency(paid, currency), icon: CheckCircle2, color: "#15803D", bg: "rgba(21,128,61,0.1)" },
        ].map((s) => (
          <div key={s.label} className="dashboard-card p-5">
            <div className="flex items-start justify-between">
              <div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{s.label}</p>
                <p className="text-xl font-bold text-gray-900 mt-1 truncate">{s.value}</p></div>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.bg }}>
                <s.icon style={{ width: 18, height: 18, color: s.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-100">
        {([["partners", "Partners"], ["referrals", "Referrals"]] as const).map(([k, lbl]) => (
          <button key={k} onClick={() => setTab(k)}
            className={cn("px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors", tab === k ? "border-emerald-500 text-emerald-700" : "border-transparent text-gray-500 hover:text-gray-700")}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Partners tab */}
      {tab === "partners" && (
        partners.length === 0 ? (
          <Empty icon={Handshake} title="No partners yet" hint="Add referral partners who send you business." action={<Button onClick={openCreateP} variant="outline">Add partner</Button>} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {partners.map((p) => (
              <div key={p.id} className={cn("dashboard-card p-5 flex flex-col gap-3", !p.isActive && "opacity-60")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                    <p className="text-[11px] text-gray-400">{p.companyName ? `${p.companyName} · ` : ""}{TYPE_LABELS[p.type]}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 flex-shrink-0">
                    {p.commissionType === "PERCENTAGE" ? `${p.commissionRate}%` : formatCurrency(p.commissionRate, p.currency)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Stat label="Referrals" value={String(p.referralCount)} />
                  <Stat label="Earned" value={formatCurrency(p.commissionEarned, p.currency)} />
                  <Stat label="Owed" value={formatCurrency(p.commissionOutstanding, p.currency)} />
                </div>
                {(p.email || p.phone) && <p className="text-[11px] text-gray-400 truncate">{[p.email, p.phone].filter(Boolean).join(" · ")}</p>}
                <div className="flex items-center gap-2 pt-1 border-t border-gray-50">
                  <button onClick={() => { setTab("referrals"); setSearch(p.name); }} className="text-[11px] font-semibold text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded-md">View referrals</button>
                  <div className="flex-1" />
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => openEditP(p)}><Edit2 className="w-3.5 h-3.5" /></Button>
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 border-red-100" onClick={() => removeP(p)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Referrals tab */}
      {tab === "referrals" && (
        <>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input className="pl-8 h-9 text-sm" placeholder="Search client or partner…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <span className="text-xs text-gray-400 ml-auto">{filteredRefs.length} referral{filteredRefs.length !== 1 ? "s" : ""}</span>
          </div>
          {filteredRefs.length === 0 ? (
            <Empty icon={BadgeDollarSign} title="No referrals" hint="Log referrals from your partners and track commissions." action={partners.length > 0 ? <Button onClick={() => setROpen(true)} variant="outline">Log referral</Button> : undefined} />
          ) : (
            <div className="dashboard-card overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100">
                  {["Client", "Partner", "Deal value", "Commission", "Status", ""].map((h) => (
                    <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 first:pl-5 last:pr-5">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredRefs.map((r) => {
                    const st = STATUS_META[r.status] ?? { label: r.status, bg: "bg-gray-100", text: "text-gray-500" };
                    return (
                      <tr key={r.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 pl-5">
                          <p className="font-medium text-gray-900 inline-flex items-center gap-1">
                            {r.clientName}
                            {r.leadId && <Link href={`/dashboard/business-setup/leads/${r.leadId}`} title="View lead"><ExternalLink className="w-3 h-3 text-gray-300 hover:text-emerald-500" /></Link>}
                          </p>
                          {r.serviceDescription && <p className="text-[11px] text-gray-400">{r.serviceDescription}</p>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{r.partnerName}</td>
                        <td className="px-4 py-3 text-gray-700">{r.dealValue != null ? formatCurrency(r.dealValue, r.currency) : "—"}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{r.commissionAmount != null ? formatCurrency(r.commissionAmount, r.currency) : "—"}</td>
                        <td className="px-4 py-3"><span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", st.bg, st.text)}>{st.label}</span></td>
                        <td className="px-4 py-3 pr-5">
                          <div className="flex items-center gap-1 justify-end">
                            {r.status === "PENDING" && (
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-blue-600 hover:bg-blue-50" onClick={() => { setConvertRef(r); setDealValue(r.dealValue?.toString() ?? ""); setCommission(""); }}>
                                <Trophy className="w-3.5 h-3.5 mr-1" /> Convert
                              </Button>
                            )}
                            {r.status === "CONVERTED" && (
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-green-600 hover:bg-green-50" onClick={() => { setPayRef(r); setPayReference(""); }}>
                                <Wallet className="w-3.5 h-3.5 mr-1" /> Pay
                              </Button>
                            )}
                            {r.status !== "CANCELLED" && r.status !== "PAID" && (
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-amber-600" title="Cancel" onClick={() => refAction(r.id, { action: "cancel" }, "Referral cancelled")}><Ban className="w-3.5 h-3.5" /></Button>
                            )}
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600" onClick={() => removeRef(r.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Partner dialog */}
      <Dialog open={pOpen} onOpenChange={setPOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editingP ? "Edit partner" : "Add partner"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2 max-h-[66vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Name *</Label><Input value={pForm.name} onChange={(e) => setPForm((f) => ({ ...f, name: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Company</Label><Input value={pForm.companyName} onChange={(e) => setPForm((f) => ({ ...f, companyName: e.target.value }))} /></div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={pForm.type} onValueChange={(v) => setPForm((f) => ({ ...f, type: v ?? "INDIVIDUAL" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={pForm.email} onChange={(e) => setPForm((f) => ({ ...f, email: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Phone</Label><Input value={pForm.phone} onChange={(e) => setPForm((f) => ({ ...f, phone: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>WhatsApp</Label><Input value={pForm.whatsapp} onChange={(e) => setPForm((f) => ({ ...f, whatsapp: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Commission</Label>
                <Select value={pForm.commissionType} onValueChange={(v) => setPForm((f) => ({ ...f, commissionType: v ?? "PERCENTAGE" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="PERCENTAGE">Percentage</SelectItem><SelectItem value="FIXED">Fixed</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{pForm.commissionType === "PERCENTAGE" ? "Rate (%)" : "Amount"}</Label>
                <Input type="number" min={0} value={pForm.commissionRate} onChange={(e) => setPForm((f) => ({ ...f, commissionRate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select value={pForm.currency} onValueChange={(v) => setPForm((f) => ({ ...f, currency: v ?? "AED" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="AED">AED</SelectItem><SelectItem value="SAR">SAR</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Payout details <span className="text-gray-400 font-normal text-[11px]">IBAN/bank · encrypted</span></Label>
              <Input value={pForm.payoutDetails} onChange={(e) => setPForm((f) => ({ ...f, payoutDetails: e.target.value }))} />
            </div>
            <div className="space-y-1.5"><Label>Notes</Label><Textarea rows={2} value={pForm.notes} onChange={(e) => setPForm((f) => ({ ...f, notes: e.target.value }))} /></div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={pForm.isActive} onChange={(e) => setPForm((f) => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 text-emerald-600" /> Active
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPOpen(false)}>Cancel</Button>
            <Button onClick={saveP} disabled={pSaving} className="text-white" style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
              {pSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}{editingP ? "Save" : "Add partner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Referral dialog */}
      <Dialog open={rOpen} onOpenChange={setROpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Log referral</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Partner *</Label>
              <Select value={rForm.partnerId} onValueChange={(v) => setRForm((f) => ({ ...f, partnerId: v ?? "" }))}>
                <SelectTrigger><SelectValue placeholder="Select partner" /></SelectTrigger>
                <SelectContent>{partners.filter((p) => p.isActive).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Client name *</Label><Input value={rForm.clientName} onChange={(e) => setRForm((f) => ({ ...f, clientName: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Client phone</Label><Input value={rForm.clientPhone} onChange={(e) => setRForm((f) => ({ ...f, clientPhone: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Client email</Label><Input type="email" value={rForm.clientEmail} onChange={(e) => setRForm((f) => ({ ...f, clientEmail: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>What was referred</Label><Input placeholder="e.g. Freezone company setup" value={rForm.serviceDescription} onChange={(e) => setRForm((f) => ({ ...f, serviceDescription: e.target.value }))} /></div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={rForm.createLead} onChange={(e) => setRForm((f) => ({ ...f, createLead: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 text-emerald-600" />
              Also create a Business Setup lead
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setROpen(false)}>Cancel</Button>
            <Button onClick={createReferral} disabled={rSaving} className="text-white" style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
              {rSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Log referral
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert dialog */}
      <Dialog open={!!convertRef} onOpenChange={(o) => !o && setConvertRef(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Convert referral</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-sm text-gray-500">{convertRef?.clientName} · {convertRef?.partnerName}</p>
            <div className="space-y-1.5">
              <Label>Deal value</Label>
              <Input type="number" min={0} value={dealValue} onChange={(e) => { setDealValue(e.target.value); if (convertRef) setCommission(String(previewCommission(convertRef.partnerId, Number(e.target.value) || 0))); }} />
            </div>
            <div className="space-y-1.5">
              <Label>Commission <span className="text-gray-400 font-normal text-[11px]">auto-calculated · editable</span></Label>
              <Input type="number" min={0} value={commission} onChange={(e) => setCommission(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertRef(null)}>Cancel</Button>
            <Button disabled={busy} className="text-white" style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}
              onClick={async () => { if (!convertRef) return; const ok = await refAction(convertRef.id, { action: "convert", dealValue: dealValue ? Number(dealValue) : null, commissionAmount: commission ? Number(commission) : undefined }, "Referral converted"); if (ok) setConvertRef(null); }}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Convert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay dialog */}
      <Dialog open={!!payRef} onOpenChange={(o) => !o && setPayRef(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Mark commission paid</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-sm text-gray-500">
              {payRef?.partnerName} — {payRef?.commissionAmount != null ? formatCurrency(payRef.commissionAmount, payRef.currency) : "—"}
            </p>
            <div className="space-y-1.5"><Label>Payment reference</Label><Input placeholder="e.g. Bank transfer #1234" value={payReference} onChange={(e) => setPayReference(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayRef(null)}>Cancel</Button>
            <Button disabled={busy} className="text-white" style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}
              onClick={async () => { if (!payRef) return; const ok = await refAction(payRef.id, { action: "pay", payoutReference: payReference || null }, "Marked paid"); if (ok) setPayRef(null); }}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Mark paid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (<div className="bg-gray-50 rounded-lg py-2"><p className="text-[11px] font-bold text-gray-700 truncate px-1">{value}</p><p className="text-[9px] text-gray-400">{label}</p></div>);
}
function Empty({ icon: Icon, title, hint, action }: { icon: any; title: string; hint: string; action?: React.ReactNode }) {
  return (<div className="dashboard-card p-12 text-center"><Icon className="w-10 h-10 text-gray-200 mx-auto mb-3" /><p className="text-sm font-medium text-gray-500">{title}</p><p className="text-xs text-gray-400 mt-1 mb-4">{hint}</p>{action}</div>);
}
