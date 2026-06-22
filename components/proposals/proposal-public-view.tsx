"use client";

import { useState } from "react";
import { CheckCircle2, Clock, XCircle, Loader2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

type LineItem = { service: string; description?: string | null; fee: number };

type Props = {
  publicToken: string;
  orgName: string;
  clientName: string;
  lineItems: LineItem[];
  subtotal: number;
  totalFee: number;
  currency: string;
  validUntil: string;
  notes: string | null;
  initialStatus: string;
  acceptedAt: string | null;
};

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; label: string; color: string; bg: string }> = {
  ACCEPTED: { icon: CheckCircle2, label: "Accepted",  color: "text-emerald-600", bg: "bg-emerald-50" },
  REJECTED: { icon: XCircle,      label: "Declined",  color: "text-red-500",     bg: "bg-red-50"     },
  EXPIRED:  { icon: Clock,        label: "Expired",   color: "text-gray-400",    bg: "bg-gray-100"   },
  SENT:     { icon: Clock,        label: "Pending",   color: "text-blue-500",    bg: "bg-blue-50"    },
};

export function ProposalPublicView({ publicToken, orgName, clientName, lineItems, subtotal, totalFee, currency, validUntil, notes, initialStatus, acceptedAt }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusCfg = (STATUS_CONFIG[status] ?? STATUS_CONFIG.SENT)!;
  const Icon = statusCfg.icon;
  const vatAmount = totalFee - subtotal;
  const hasVat = vatAmount > 0.005;

  async function accept() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/proposals/${publicToken}/accept`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to accept");
      setStatus("ACCEPTED");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-600 mb-3">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{orgName}</h1>
          <p className="text-gray-500 text-sm">Business Setup Proposal</p>
        </div>

        {/* Status banner (for non-SENT states) */}
        {status !== "SENT" && (
          <div className={cn("rounded-2xl p-4 flex items-center gap-3", statusCfg.bg)}>
            <Icon className={cn("w-5 h-5 flex-shrink-0", statusCfg.color)} />
            <div>
              <p className={cn("font-semibold text-sm", statusCfg.color)}>Proposal {statusCfg.label}</p>
              {status === "ACCEPTED" && acceptedAt && (
                <p className="text-[12px] text-gray-500 mt-0.5">Accepted on {formatDate(acceptedAt)}</p>
              )}
              {status === "EXPIRED" && (
                <p className="text-[12px] text-gray-500 mt-0.5">This proposal expired on {formatDate(validUntil)}.</p>
              )}
            </div>
          </div>
        )}

        {/* Proposal card */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-50">
            <p className="text-[13px] text-gray-500">Prepared for</p>
            <p className="text-lg font-semibold text-gray-900">{clientName}</p>
            <p className="text-[12px] text-gray-400 mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Valid until {formatDate(validUntil)}
            </p>
          </div>

          {/* Line items */}
          <div className="divide-y divide-gray-50">
            {lineItems.map((li, i) => (
              <div key={i} className="px-6 py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{li.service}</p>
                  {li.description && <p className="text-[12px] text-gray-400 mt-0.5">{li.description}</p>}
                </div>
                <p className="text-sm font-semibold text-gray-900 flex-shrink-0">
                  {formatCurrency(li.fee, currency)}
                </p>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="px-6 py-4 bg-gray-50/50 space-y-2 border-t border-gray-100">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal, currency)}</span>
            </div>
            {hasVat && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>VAT</span>
                <span>{formatCurrency(vatAmount, currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
              <span>Total</span>
              <span>{formatCurrency(totalFee, currency)}</span>
            </div>
          </div>

          {/* Notes */}
          {notes && (
            <div className="px-6 py-4 border-t border-gray-50">
              <p className="text-[12px] text-gray-400 font-semibold uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{notes}</p>
            </div>
          )}
        </div>

        {/* Accept CTA — only shown when SENT */}
        {status === "SENT" && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4 text-center">
            <p className="text-sm text-gray-600">
              Ready to proceed? Accept this proposal and our team will contact you to begin the business setup process.
            </p>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button
              onClick={accept}
              disabled={loading}
              className="w-full h-12 text-base font-semibold text-white rounded-2xl"
              style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
              Accept proposal
            </Button>
            <p className="text-[11px] text-gray-400">By accepting, you confirm your intent to proceed. No payment is collected at this stage.</p>
          </div>
        )}

        {status === "ACCEPTED" && (
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <p className="text-base font-semibold text-gray-900">Thank you!</p>
            <p className="text-sm text-gray-500">We've received your acceptance and will be in touch shortly to get started.</p>
          </div>
        )}

        <p className="text-center text-[11px] text-gray-300">Powered by Maktaby</p>
      </div>
    </div>
  );
}
