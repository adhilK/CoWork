"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { FileText, CheckCircle2, Clock, AlertCircle, CreditCard, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, humanizeEnum } from "@/lib/utils";

type Invoice = {
  id: string;
  invoiceNumber: string | null;
  amount: number;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  currency: string;
  status: string;
  dueDate: string;
  paidAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
};

type Props = {
  invoices: Invoice[];
};

const STATUS_STYLES: Record<string, string> = {
  DRAFT:     "bg-gray-50 text-gray-500 border-gray-200",
  PENDING:   "bg-amber-50 text-amber-700 border-amber-200",
  PAID:      "bg-green-50 text-green-700 border-green-200",
  OVERDUE:   "bg-red-50 text-red-700 border-red-200",
  CANCELLED: "bg-gray-50 text-gray-400 border-gray-100",
  REFUNDED:  "bg-violet-50 text-violet-700 border-violet-200",
};

const STATUS_ICON: Record<string, React.ReactElement> = {
  PAID:    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />,
  OVERDUE: <AlertCircle className="w-3.5 h-3.5 text-red-500" />,
  PENDING: <Clock className="w-3.5 h-3.5 text-amber-500" />,
};

function PayNowButton({ invoiceId }: { invoiceId: string }) {
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    setLoading(true);
    try {
      const res = await fetch("/api/payments/tap/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Payment could not be initiated");
        return;
      }
      window.location.href = data.data.checkoutUrl;
    } catch {
      toast.error("Something went wrong, please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      size="sm"
      onClick={handlePay}
      disabled={loading}
      className="text-white font-medium h-7 px-3 text-xs"
      style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}
    >
      {loading ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <>
          <CreditCard className="w-3 h-3 mr-1" />
          Pay now
        </>
      )}
    </Button>
  );
}

export function MyInvoicesView({ invoices }: Props) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const tapStatus = searchParams.get("tap_status");
    if (tapStatus === "CAPTURED") {
      toast.success("Payment received! Your invoice will be marked as paid shortly.");
    } else if (tapStatus && tapStatus !== "INITIATED") {
      toast.error(`Payment ${tapStatus.toLowerCase()}. Please try again or contact support.`);
    }
  }, [searchParams]);

  return (
    <div className="space-y-5 animate-fade-in max-w-3xl">
      <div>
        <h1 className="page-title">Invoices</h1>
        <p className="page-subtitle">Your billing history and outstanding invoices.</p>
      </div>

      {/* Summary cards */}
      {invoices.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(["PENDING", "PAID", "OVERDUE"] as const).map((status) => {
            const count = invoices.filter((i) => i.status === status).length;
            const total = invoices
              .filter((i) => i.status === status)
              .reduce((s, i) => s + i.totalAmount, 0);
            const currency = invoices[0]?.currency ?? "AED";
            return (
              <div key={status} className="dashboard-card p-4">
                <div className="flex items-center gap-2 mb-1">
                  {STATUS_ICON[status]}
                  <span className="text-xs font-medium text-gray-500">{humanizeEnum(status)}</span>
                </div>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(total, currency)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{count} invoice{count !== 1 ? "s" : ""}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Table */}
      <div className="dashboard-card overflow-hidden">
        {invoices.length === 0 ? (
          <div className="text-center py-16 px-4">
            <FileText className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400 font-medium">No invoices yet</p>
            <p className="text-xs text-gray-300 mt-1">
              Your invoices will appear here once generated.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-400 px-5 py-3.5">Invoice</th>
                  <th className="text-left text-xs font-medium text-gray-400 px-3 py-3.5 hidden sm:table-cell">Period</th>
                  <th className="text-right text-xs font-medium text-gray-400 px-3 py-3.5">Amount</th>
                  <th className="text-left text-xs font-medium text-gray-400 px-3 py-3.5">Due date</th>
                  <th className="text-left text-xs font-medium text-gray-400 px-3 py-3.5">Status</th>
                  <th className="text-left text-xs font-medium text-gray-400 px-5 py-3.5 hidden sm:table-cell">Paid</th>
                  <th className="text-left text-xs font-medium text-gray-400 px-3 py-3.5 w-8"></th>
                  <th className="text-left text-xs font-medium text-gray-400 px-3 py-3.5 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-gray-900 text-sm">
                        {inv.invoiceNumber ?? `INV-${inv.id.slice(-6).toUpperCase()}`}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-xs text-gray-400 hidden sm:table-cell">
                      {inv.periodStart && inv.periodEnd
                        ? `${formatDate(inv.periodStart)} – ${formatDate(inv.periodEnd)}`
                        : formatDate(inv.createdAt)}
                    </td>
                    <td className="px-3 py-3.5 text-right text-sm">
                      <div className="font-semibold text-gray-900">
                        {formatCurrency(inv.totalAmount, inv.currency)}
                      </div>
                      {inv.vatAmount > 0 && (
                        <div className="text-[11px] text-gray-400">
                          incl. {formatCurrency(inv.vatAmount, inv.currency)} VAT
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-xs text-gray-500">{formatDate(inv.dueDate)}</td>
                    <td className="px-3 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                          STATUS_STYLES[inv.status] ?? "bg-gray-50 text-gray-500 border-gray-200"
                        }`}
                      >
                        {humanizeEnum(inv.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-400 hidden sm:table-cell">
                      {inv.paidAt ? formatDate(inv.paidAt) : "—"}
                    </td>
                    <td className="px-3 py-3.5">
                      {(inv.status === "PENDING" || inv.status === "OVERDUE") && (
                        <PayNowButton invoiceId={inv.id} />
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      <a href={`/api/invoices/${inv.id}/pdf`} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700" title="Download PDF">
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
