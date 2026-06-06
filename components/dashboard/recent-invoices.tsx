"use client";

import { formatCurrency, formatDate, initials, cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { InvoiceStatus } from "@prisma/client";

type Invoice = {
  id: string; invoiceNumber: string; amount: any; status: InvoiceStatus;
  dueDate: Date; createdAt: Date;
  member: { user: { name: string | null } };
};

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  PENDING: "bg-amber-100 text-amber-800",
  PAID: "bg-green-100 text-green-800",
  OVERDUE: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-500",
  REFUNDED: "bg-purple-100 text-purple-700",
};

export function RecentInvoices({ invoices, currency }: { invoices: Invoice[]; currency: string }) {
  return (
    <div className="dashboard-card p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-gray-900">Recent invoices</h2>
        <a href="/dashboard/invoices" className="text-sm font-medium" style={{ color: "#22C55E" }}>
          View all →
        </a>
      </div>

      {invoices.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No invoices yet</p>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <div key={inv.id}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
              <Avatar className="w-9 h-9 flex-shrink-0">
                <AvatarFallback className="text-xs font-bold bg-indigo-100 text-indigo-700">
                  {initials(inv.member?.user?.name ?? "?")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {inv.member?.user?.name ?? "Unknown"}
                </p>
                <p className="text-xs text-gray-500">{inv.invoiceNumber}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-gray-900">
                  {formatCurrency(Number(inv.amount), currency)}
                </p>
                <Badge className={cn("text-xs mt-0.5", STATUS_STYLES[inv.status])}>
                  {inv.status.charAt(0) + inv.status.slice(1).toLowerCase()}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
