"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, ShieldCheck, AlertCircle, Loader2, QrCode, FileCheck2, Info, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils";

type RecentInvoice = {
  id: string;
  invoiceNumber: string | null;
  memberName: string;
  totalAmount: number;
  currency: string;
  zatcaStatus: string | null;
  createdAt: string;
};

type Props = {
  isOwner: boolean;
  jurisdiction: string;
  vatNumber: string | null;
  sellerName: string | null;
  zatcaEnabled: boolean;
  arabicInvoices: boolean;
  providerConfigured: boolean;
  counts: Record<string, number>;
  recent: RecentInvoice[];
};

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: "bg-amber-50", text: "text-amber-700" },
  REPORTED: { bg: "bg-blue-50", text: "text-blue-700" },
  CLEARED: { bg: "bg-green-50", text: "text-green-700" },
  REJECTED: { bg: "bg-red-50", text: "text-red-600" },
};

export function ZatcaSettingsView(props: Props) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(props.zatcaEnabled);
  const [arabic, setArabic] = useState(props.arabicInvoices);
  const [busy, setBusy] = useState(false);

  const isKsa = props.jurisdiction === "KSA";

  async function update(patch: { zatcaEnabled?: boolean; arabicInvoices?: boolean }) {
    setBusy(true);
    try {
      const res = await fetch("/api/zatca/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success("ZATCA settings saved");
      router.refresh();
    } catch (err) {
      // revert optimistic toggles
      if (patch.zatcaEnabled !== undefined) setEnabled(!patch.zatcaEnabled);
      if (patch.arabicInvoices !== undefined) setArabic(!patch.arabicInvoices);
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/settings" className="p-1.5 rounded-lg hover:bg-black/5">
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </Link>
        <div>
          <h1 className="page-title">ZATCA E-Invoicing</h1>
          <p className="page-subtitle">Saudi Arabia (KSA) tax-invoice compliance — Fatoorah</p>
        </div>
      </div>

      {/* Jurisdiction notice */}
      {!isKsa && (
        <div className="dashboard-card p-4 flex items-start gap-3 bg-blue-50/40 border-blue-100">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">
            ZATCA applies to <strong>KSA</strong> tax invoices. Your organization's primary jurisdiction is
            <strong> {props.jurisdiction}</strong>. You can still enable it below if you issue invoices in Saudi Arabia —
            it only affects invoices for KSA.
          </p>
        </div>
      )}

      {/* Enable toggle */}
      <div className="dashboard-card p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${enabled ? "bg-green-50" : "bg-gray-100"}`}>
            <ShieldCheck className={`w-5 h-5 ${enabled ? "text-green-600" : "text-gray-400"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">ZATCA e-invoicing</p>
            <p className="text-xs text-gray-500 mt-0.5">
              When enabled, KSA tax invoices are generated with a ZATCA-compliant Phase-1 QR code and queued for reporting.
            </p>
          </div>
          <button
            role="switch" aria-checked={enabled} disabled={busy || !props.isOwner}
            onClick={() => { const next = !enabled; setEnabled(next); update({ zatcaEnabled: next }); }}
            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${enabled ? "bg-emerald-500" : "bg-gray-300"} disabled:opacity-60`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? "translate-x-5" : ""}`} />
          </button>
        </div>

        <Separator />

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-50">
            <FileCheck2 className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">Arabic tax invoices</p>
            <p className="text-xs text-gray-500 mt-0.5">Arabic is mandatory on KSA tax invoices. When on, invoice PDFs are issued bilingually (Arabic + English).</p>
          </div>
          <button
            role="switch" aria-checked={arabic} disabled={busy || !props.isOwner}
            onClick={() => { const next = !arabic; setArabic(next); update({ arabicInvoices: next }); }}
            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${arabic ? "bg-emerald-500" : "bg-gray-300"} disabled:opacity-60`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${arabic ? "translate-x-5" : ""}`} />
          </button>
        </div>

        {!props.isOwner && (
          <p className="text-[11px] text-gray-400">Only the workspace owner can change these settings.</p>
        )}
      </div>

      {/* Readiness checklist */}
      <div className="dashboard-card p-6 space-y-3">
        <h2 className="text-base font-semibold text-gray-900">Readiness</h2>
        <Separator />
        <Check ok={!!props.vatNumber} label="VAT registration number set"
          hint={props.vatNumber ? props.vatNumber : "Add it in Settings → Tax registration number"} />
        <Check ok={!!props.sellerName} label="Seller (legal) name set" hint={props.sellerName ?? "Set your organization name"} />
        <Check ok={enabled} label="ZATCA e-invoicing enabled" hint={enabled ? "Phase-1 QR active on KSA invoices" : "Toggle on above"} />
        <Check ok={props.providerConfigured} label="Phase-2 provider configured" optional
          hint={props.providerConfigured ? "Reporting/clearance middleware connected" : "Phase 2 (clearance) uses certified middleware — wired in Phase 3"} />
      </div>

      {/* How it works */}
      <div className="dashboard-card p-5 flex items-start gap-3 bg-gray-50/60">
        <QrCode className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-gray-600 space-y-1.5">
          <p><strong>Phase 1 (live):</strong> every KSA tax invoice carries a TLV-encoded QR (seller name, VAT number, timestamp, total, VAT) — scannable with the ZATCA app and printed on the PDF.</p>
          <p><strong>Phase 2 (queued stub):</strong> invoices are queued for reporting/clearance. Cryptographic stamping and UBL submission will go through certified middleware (e.g. Wafeq) — invoices currently move to <em>Reported</em> automatically.</p>
        </div>
      </div>

      {/* Status summary */}
      {Object.keys(props.counts).length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {["PENDING", "REPORTED", "CLEARED", "REJECTED"].map((st) => (
            <div key={st} className="dashboard-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{st}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{props.counts[st] ?? 0}</p>
            </div>
          ))}
        </div>
      )}

      {/* Recent ZATCA invoices */}
      {props.recent.length > 0 && (
        <div className="dashboard-card overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">Recent ZATCA invoices</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {props.recent.map((r) => {
              const st = STATUS_STYLE[r.zatcaStatus ?? ""] ?? { bg: "bg-gray-100", text: "text-gray-500" };
              return (
                <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{r.invoiceNumber ?? r.id.slice(-8)}</p>
                    <p className="text-[11px] text-gray-400">{r.memberName} · {formatDate(r.createdAt)}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{formatCurrency(r.totalAmount, r.currency)}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>{r.zatcaStatus}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Check({ ok, label, hint, optional }: { ok: boolean; label: string; hint: string; optional?: boolean }) {
  return (
    <div className="flex items-start gap-2.5">
      {ok
        ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
        : <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${optional ? "text-gray-300" : "text-amber-400"}`} />}
      <div>
        <p className="text-sm text-gray-800">{label} {optional && <span className="text-[10px] text-gray-400">(optional)</span>}</p>
        <p className="text-[11px] text-gray-400">{hint}</p>
      </div>
    </div>
  );
}
