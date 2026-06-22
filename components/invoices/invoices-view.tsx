"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, FileText, AlertCircle, ChevronDown, ChevronUp, Zap, Download, Bell } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate, formatDateTime, initials, cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CreateInvoiceDialog } from "@/components/invoices/create-invoice-dialog";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import type { InvoiceStatus } from "@prisma/client";

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  DRAFT:     "bg-gray-100 text-gray-600",
  PENDING:   "bg-amber-100 text-amber-800",
  PAID:      "bg-green-100 text-green-800",
  OVERDUE:   "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-500",
  REFUNDED:  "bg-purple-100 text-purple-700",
};

type Invoice = {
  id: string; invoiceNumber: string; amount: any; totalAmount: any; status: InvoiceStatus;
  dueDate: Date; createdAt: Date; paidAt: Date | null;
  remindersSent: number; lastReminderAt: Date | null;
  member: { id: string; whatsAppNumber: string | null; user: { name: string | null; email: string } };
};

type UnbilledBooking = {
  id: string; startTime: Date; endTime: Date; title: string | null;
  amountCharged: any; memberId: string | null;
  resource: { name: string };
  member: { id: string; user: { name: string | null; email: string } } | null;
};

type Summary = { status: InvoiceStatus; _sum: { amount: any }; _count: number };
type Member = { id: string; user: { name: string | null; email: string } };

type Props = {
  invoices: Invoice[]; total: number; page: number; limit: number;
  summary: Summary[]; collectedThisMonth: number; currency: string; vatRate: number; members: Member[];
  organizationId: string; unbilledBookings: UnbilledBooking[]; highlightId?: string;
};

// Group unbilled bookings by member
function groupByMember(bookings: UnbilledBooking[]) {
  const map = new Map<string, { memberId: string; name: string; bookings: UnbilledBooking[]; total: number }>();
  for (const b of bookings) {
    const key = b.memberId ?? "__walkin__";
    const name = b.member?.user?.name ?? b.member?.user?.email ?? "Walk-in (no member)";
    if (!map.has(key)) map.set(key, { memberId: b.memberId ?? "", name, bookings: [], total: 0 });
    map.get(key)!.bookings.push(b);
    map.get(key)!.total += Number(b.amountCharged);
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

function GenerateInvoiceDialog({
  open, onClose, memberGroup, currency, vatRate, members, onSuccess,
}: {
  open: boolean; onClose: () => void;
  memberGroup: { memberId: string; name: string; bookings: UnbilledBooking[]; total: number } | null;
  currency: string; vatRate: number; members: Member[];
  onSuccess: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dueDate, setDueDate] = useState(format(addDays(new Date(), 14), "yyyy-MM-dd"));
  const [saving, setSaving] = useState(false);

  // Pre-select all bookings whenever a new member group is opened
  useEffect(() => {
    if (memberGroup) setSelected(new Set(group.bookings.map(b => b.id)));
  }, [memberGroup]);

  if (!memberGroup) return null;
  const group = memberGroup;

  const allSelected = group.bookings.every(b => selected.has(b.id));
  const selectedTotal = group.bookings
    .filter(b => selected.has(b.id))
    .reduce((s, b) => s + Number(b.amountCharged), 0);
  const vatAmount = Math.round(selectedTotal * vatRate * 100) / 100;
  const grandTotal = Math.round((selectedTotal + vatAmount) * 100) / 100;
  const vatPct = `${(vatRate * 100).toFixed(vatRate * 100 % 1 === 0 ? 0 : 2)}%`;

  function toggle(id: string) {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  async function handleGenerate() {
    if (selected.size === 0) { toast.error("Select at least one booking"); return; }
    if (!group.memberId) { toast.error("Walk-in bookings cannot be invoiced to a member"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/invoices/from-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingIds: Array.from(selected),
          memberId: group.memberId,
          dueDate,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success(`Invoice generated for ${group.name}`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate invoice");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">Generate invoice — {group.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2 w-full min-w-0">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs text-gray-500">Select bookings to invoice</Label>
              <button className="text-xs text-indigo-600 hover:underline flex-shrink-0"
                onClick={() => setSelected(allSelected ? new Set() : new Set(group.bookings.map(b => b.id)))}>
                {allSelected ? "Deselect all" : "Select all"}
              </button>
            </div>
            <div className="space-y-1.5 max-h-52 overflow-y-auto overflow-x-hidden">
              {group.bookings.map((b) => (
                <label key={b.id} className={cn(
                  "flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors w-full",
                  selected.has(b.id) ? "border-indigo-200 bg-indigo-50" : "border-gray-100 hover:bg-gray-50"
                )}>
                  <input type="checkbox" checked={selected.has(b.id)} onChange={() => toggle(b.id)} className="flex-shrink-0 w-3.5 h-3.5 accent-indigo-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {b.resource.name}{b.title ? ` — ${b.title}` : ""}
                    </p>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs text-gray-400 truncate">
                        {format(new Date(b.startTime), "d MMM, HH:mm")} – {format(new Date(b.endTime), "HH:mm")}
                      </p>
                      <span className="text-xs font-semibold text-gray-900 flex-shrink-0 tabular-nums">
                        {formatCurrency(Number(b.amountCharged), currency)}
                      </span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1.5 border-t pt-3">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-gray-500 min-w-0 truncate">Subtotal · {selected.size} booking{selected.size !== 1 ? "s" : ""}</span>
              <span className="text-gray-700 flex-shrink-0 tabular-nums">{formatCurrency(selectedTotal, currency)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-gray-500">VAT ({vatPct})</span>
              <span className="text-gray-700 flex-shrink-0 tabular-nums">{formatCurrency(vatAmount, currency)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm font-semibold border-t pt-1.5">
              <span className="text-gray-900">Total</span>
              <span className="text-gray-900 flex-shrink-0 tabular-nums">{formatCurrency(grandTotal, currency)}</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Due date</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleGenerate} disabled={saving || selected.size === 0} className="text-white"
            style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
            {saving ? "Generating…" : (
              <span className="flex flex-col items-center leading-tight">
                <span>Generate invoice</span>
                <span className="text-[10px] opacity-80">{formatCurrency(grandTotal, currency)} incl. VAT</span>
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function InvoicesView({ invoices, total, page, limit, summary, collectedThisMonth, currency, vatRate, members, organizationId, unbilledBookings, highlightId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [generateDialog, setGenerateDialog] = useState<ReturnType<typeof groupByMember>[0] | null>(null);
  const [expandedUnbilled, setExpandedUnbilled] = useState(true);

  useEffect(() => {
    if (!highlightId) return;
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-invoice-id="${highlightId}"]`);
      if (el) {
        const rect = el.getBoundingClientRect();
        window.scrollTo({ top: window.scrollY + rect.top - 120, behavior: "smooth" });
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [highlightId]);

  const totalPages = Math.ceil(total / limit);
  const memberGroups = groupByMember(unbilledBookings);
  const totalUnbilled = unbilledBookings.reduce((s, b) => s + Number(b.amountCharged), 0);

  const outstanding = Number(summary.find((s) => s.status === "PENDING")?._sum.amount ?? 0);
  const overdue = Number(summary.find((s) => s.status === "OVERDUE")?._sum.amount ?? 0);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") params.set(key, value); else params.delete(key);
    params.delete("page");
    startTransition(() => router.push(`/dashboard/invoices?${params}`));
  }

  async function markPaid(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await fetch(`/api/invoices/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID", paidAt: new Date() }),
      });
      toast.success("Invoice marked as paid");
      router.refresh();
    } catch { toast.error("Failed to update invoice"); }
  }

  async function sendReminder(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/invoices/${id}/remind`, { method: "POST" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success("Payment reminder sent via WhatsApp");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send reminder");
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Invoices & Billing</h1>
          <p className="page-subtitle">{total} invoice{total !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="h-9 font-semibold text-white"
          style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
          <Plus className="w-4 h-4 mr-1.5" /> New invoice
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="dashboard-card p-4">
          <p className="text-xs text-gray-500">Collected this month</p>
          <p className="text-xl font-bold mt-1 text-emerald-600">{formatCurrency(collectedThisMonth, currency)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Paid invoices, by payment date</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-xs text-gray-500">Outstanding</p>
          <p className="text-xl font-bold mt-1 text-amber-600">{formatCurrency(outstanding, currency)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">All unpaid invoices</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-xs text-gray-500">Overdue</p>
          <p className="text-xl font-bold mt-1 text-red-500">{formatCurrency(overdue, currency)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Past due date</p>
        </div>
        <div className={cn("dashboard-card p-4 border-2", totalUnbilled > 0 ? "border-indigo-200" : "border-transparent")}>
          <p className="text-xs text-gray-500">Unbilled charges</p>
          <p className={cn("text-xl font-bold mt-1", totalUnbilled > 0 ? "text-indigo-600" : "text-gray-400")}>
            {formatCurrency(totalUnbilled, currency)}
          </p>
          {totalUnbilled > 0 && <p className="text-[10px] text-indigo-400 mt-0.5">Ready to invoice</p>}
        </div>
      </div>

      {/* Unbilled bookings panel */}
      {memberGroups.length > 0 && (
        <div className="dashboard-card overflow-hidden border border-indigo-100">
          <button
            onClick={() => setExpandedUnbilled(!expandedUnbilled)}
            className="w-full flex items-center justify-between px-4 py-3 bg-indigo-50/60 hover:bg-indigo-50 transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <Zap className="w-4 h-4 text-indigo-500 flex-shrink-0" />
              <div className="min-w-0">
                <span className="font-semibold text-indigo-800 text-sm">Unbilled bookings</span>
                <span className="text-indigo-500 text-xs ml-1.5 hidden sm:inline">
                  {formatCurrency(totalUnbilled, currency)} · {memberGroups.length} member{memberGroups.length !== 1 ? "s" : ""}
                </span>
                <span className="text-indigo-500 text-xs ml-1.5 sm:hidden">
                  {formatCurrency(totalUnbilled, currency)}
                </span>
              </div>
            </div>
            {expandedUnbilled ? <ChevronUp className="w-4 h-4 text-indigo-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-indigo-400 flex-shrink-0" />}
          </button>

          {expandedUnbilled && (
            <div className="divide-y divide-gray-50">
              {memberGroups.map((group) => (
                <div key={group.memberId || "walkin"} className="flex items-center gap-2 sm:gap-4 px-4 py-3 hover:bg-gray-50/50">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback className="text-xs font-bold bg-indigo-100 text-indigo-700">
                      {initials(group.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{group.name}</p>
                    <p className="text-xs text-gray-400">
                      {group.bookings.length} booking{group.bookings.length !== 1 ? "s" : ""}
                      <span className="sm:hidden font-semibold text-gray-700"> · {formatCurrency(group.total, currency)}</span>
                    </p>
                  </div>
                  <span className="hidden sm:inline text-sm font-semibold text-gray-900 flex-shrink-0">{formatCurrency(group.total, currency)}</span>
                  {group.memberId ? (
                    <Button size="sm" variant="outline"
                      className="h-7 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 flex-shrink-0"
                      onClick={() => setGenerateDialog(group)}>
                      Invoice
                    </Button>
                  ) : (
                    <span className="text-xs text-gray-400 italic flex-shrink-0">Walk-in</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select defaultValue={searchParams.get("status") ?? "all"} onValueChange={(v) => updateFilter("status", v ?? "all")}>
          <SelectTrigger className="h-9 w-36 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["all", "PENDING", "PAID", "OVERDUE", "DRAFT"].map((s) => (
              <SelectItem key={s} value={s}>{s === "all" ? "All statuses" : s.charAt(0) + s.slice(1).toLowerCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-gray-500">{total} result{total !== 1 ? "s" : ""}</span>
      </div>

      {/* Invoice list — card on mobile, table on sm+ */}
      {invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No invoices yet"
          description="Invoices carry the right VAT for your jurisdiction and download as a PDF. They're created automatically from plans and bookings, or you can raise one by hand."
          steps={[
            "Members on a plan are billed automatically each month.",
            "Turn unbilled bookings into invoices from the panel above.",
            "Or create a one-off invoice for any member.",
          ]}
          primary={{ label: "New invoice", onClick: () => setCreateOpen(true) }}
        />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="sm:hidden dashboard-card divide-y divide-gray-50 overflow-hidden">
            {invoices.map((inv) => (
              <div key={inv.id} data-invoice-id={inv.id} className={cn("flex items-center gap-3 px-4 py-3 transition-colors", highlightId === inv.id ? "border-l-4 border-emerald-400 bg-emerald-50 pl-3" : "border-l-4 border-transparent")}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-gray-500">{inv.invoiceNumber}</span>
                    <div className="flex flex-col items-end gap-0.5">
                      <Badge className={cn("text-[10px]", STATUS_STYLES[inv.status])}>
                        {inv.status.charAt(0) + inv.status.slice(1).toLowerCase()}
                      </Badge>
                      {inv.status === "OVERDUE" && inv.remindersSent > 0 && (
                        <span className="text-[10px] text-gray-400">{inv.remindersSent}/3 reminders</span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mt-0.5 truncate">
                    {inv.member?.user?.name ?? inv.member?.user?.email}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-400">Due {formatDate(inv.dueDate)}</span>
                    <span className="text-sm font-bold text-gray-900">{formatCurrency(Number(inv.totalAmount), currency)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {inv.status === "OVERDUE" && inv.member?.whatsAppNumber && inv.remindersSent < 3 && (
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-orange-600 border-orange-200 hover:bg-orange-50"
                      title="Send WhatsApp reminder" onClick={(e) => sendReminder(inv.id, e)}>
                      <Bell className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {(inv.status === "PENDING" || inv.status === "OVERDUE") && (
                    <Button variant="outline" size="sm" className="h-7 text-xs text-green-700 border-green-200 hover:bg-green-50"
                      onClick={(e) => markPaid(inv.id, e)}>
                      Paid
                    </Button>
                  )}
                  <a href={`/api/invoices/${inv.id}/pdf`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700">
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block dashboard-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead>Invoice</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id} data-invoice-id={inv.id} className={cn("transition-colors", highlightId === inv.id ? "bg-emerald-50 hover:bg-emerald-50" : "hover:bg-gray-50/50")}>
                    <TableCell className={cn(highlightId === inv.id && "border-l-4 border-emerald-400 pl-3")}>
                      <div className="flex items-center gap-2">
                        <FileText className={cn("w-4 h-4", highlightId === inv.id ? "text-emerald-500" : "text-gray-400")} />
                        <span className="text-sm font-mono font-medium text-gray-700">{inv.invoiceNumber}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-7 h-7">
                          <AvatarFallback className="text-xs font-bold bg-indigo-100 text-indigo-700">
                            {initials(inv.member?.user?.name ?? "")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{inv.member?.user?.name ?? inv.member?.user?.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-semibold text-gray-900">{formatCurrency(Number(inv.totalAmount), currency)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <Badge className={cn("text-xs w-fit", STATUS_STYLES[inv.status])}>
                          {inv.status.charAt(0) + inv.status.slice(1).toLowerCase()}
                        </Badge>
                        {inv.status === "OVERDUE" && inv.remindersSent > 0 && (
                          <span className="text-[10px] text-gray-400">
                            {inv.remindersSent}/3 reminders
                            {inv.lastReminderAt ? ` · ${formatDate(inv.lastReminderAt)}` : ""}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{formatDate(inv.dueDate)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {inv.status === "OVERDUE" && inv.member?.whatsAppNumber && inv.remindersSent < 3 && (
                          <Button variant="outline" size="sm"
                            className="h-7 text-xs text-orange-600 border-orange-200 hover:bg-orange-50 gap-1"
                            onClick={(e) => sendReminder(inv.id, e)}
                            title={`Send reminder ${inv.remindersSent + 1}/3`}>
                            <Bell className="w-3 h-3" />
                            Remind
                          </Button>
                        )}
                        {(inv.status === "PENDING" || inv.status === "OVERDUE") && (
                          <Button variant="outline" size="sm" className="h-7 text-xs text-green-700 border-green-200 hover:bg-green-50"
                            onClick={(e) => markPaid(inv.id, e)}>
                            Mark paid
                          </Button>
                        )}
                        <a href={`/api/invoices/${inv.id}/pdf`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700" title="Download PDF">
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                        </a>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {totalPages > 1 && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => updateFilter("page", String(page - 1))}>Previous</Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => updateFilter("page", String(page + 1))}>Next</Button>
        </div>
      )}

      <CreateInvoiceDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        members={members}
        currency={currency}
        vatRate={vatRate}
        onSuccess={() => { setCreateOpen(false); router.refresh(); }}
      />

      <GenerateInvoiceDialog
        open={!!generateDialog}
        onClose={() => setGenerateDialog(null)}
        memberGroup={generateDialog}
        currency={currency}
        vatRate={vatRate}
        members={members}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
