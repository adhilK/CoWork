import type { ReactElement } from "react";
import { FileText, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { formatCurrency, formatDate, humanizeEnum } from "@/lib/utils";

type Invoice = {
  id: string;
  invoiceNumber: string | null;
  amount: number;
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
  DRAFT: "bg-gray-50 text-gray-500 border-gray-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  PAID: "bg-green-50 text-green-700 border-green-200",
  OVERDUE: "bg-red-50 text-red-700 border-red-200",
  CANCELLED: "bg-gray-50 text-gray-400 border-gray-100",
  REFUNDED: "bg-violet-50 text-violet-700 border-violet-200",
};

const STATUS_ICON: Record<string, ReactElement> = {
  PAID: <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />,
  OVERDUE: <AlertCircle className="w-3.5 h-3.5 text-red-500" />,
  PENDING: <Clock className="w-3.5 h-3.5 text-amber-500" />,
};

export function MyInvoicesView({ invoices }: Props) {
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
              .reduce((s, i) => s + i.amount, 0);
            const currency = invoices[0]?.currency ?? "GBP";
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
                  <th className="text-left text-xs font-medium text-gray-400 px-5 py-3.5">
                    Invoice
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 px-3 py-3.5 hidden sm:table-cell">
                    Period
                  </th>
                  <th className="text-right text-xs font-medium text-gray-400 px-3 py-3.5">
                    Amount
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 px-3 py-3.5">
                    Due date
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 px-3 py-3.5">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 px-5 py-3.5 hidden sm:table-cell">
                    Paid
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
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
                    <td className="px-3 py-3.5 text-right font-semibold text-gray-900 text-sm">
                      {formatCurrency(inv.amount, inv.currency)}
                    </td>
                    <td className="px-3 py-3.5 text-xs text-gray-500">
                      {formatDate(inv.dueDate)}
                    </td>
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
