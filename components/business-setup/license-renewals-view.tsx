"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshCw, AlertTriangle, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";

type Renewal = {
  applicationId: string;
  leadId: string;
  clientName: string;
  companyName: string | null;
  licenseType: string;
  jurisdiction: string;
  licenseNumber: string | null;
  licenseExpiry: string;
  daysUntilExpiry: number;
};

function urgencyStyle(days: number): { bg: string; text: string; label: string; icon: typeof AlertTriangle } {
  if (days <= 14) return { bg: "bg-red-50", text: "text-red-600", label: `${days}d`, icon: AlertTriangle };
  if (days <= 30) return { bg: "bg-amber-50", text: "text-amber-700", label: `${days}d`, icon: Clock };
  return { bg: "bg-blue-50", text: "text-blue-600", label: `${days}d`, icon: CheckCircle2 };
}

export function LicenseRenewalsView() {
  const router = useRouter();
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/business-setup/renewals")
      .then((r) => r.json())
      .then((d) => setRenewals(d.data?.renewals ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function startRenewal(r: Renewal) {
    const params = new URLSearchParams({
      clientName: r.clientName,
      companyName: r.companyName ?? "",
      licenseType: r.licenseType,
      jurisdiction: r.jurisdiction,
      renewalFor: r.leadId,
    });
    router.push(`/dashboard/business-setup/leads?new=1&${params.toString()}`);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">License Renewals</h1>
          <p className="page-subtitle">Business licenses expiring in the next 90 days</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/business-setup/leads">
            <Button variant="outline" size="sm" className="text-xs">Pipeline</Button>
          </Link>
          <Link href="/dashboard/business-setup/licenses">
            <Button variant="outline" size="sm" className="text-xs">License catalog</Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="dashboard-card p-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
        </div>
      ) : renewals.length === 0 ? (
        <div className="dashboard-card p-12 text-center">
          <CheckCircle2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">No licenses expiring in the next 90 days</p>
          <p className="text-xs text-gray-400 mt-1">You're all caught up.</p>
        </div>
      ) : (
        <div className="dashboard-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Client / Company", "License type", "License #", "Expiry", "Days left", ""].map((h) => (
                    <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 first:pl-5 last:pr-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {renewals.map((r) => {
                  const u = urgencyStyle(r.daysUntilExpiry);
                  const Icon = u.icon;
                  return (
                    <tr key={r.applicationId} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 pl-5">
                        <p className="font-medium text-gray-900">{r.clientName}</p>
                        {r.companyName && <p className="text-[11px] text-gray-400">{r.companyName}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-700 text-[12px]">{r.licenseType.replace(/_/g, " ")}</p>
                        <p className="text-[10px] text-gray-400">{r.jurisdiction}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-[12px] text-gray-500">
                        {r.licenseNumber ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-gray-700 whitespace-nowrap">
                        {formatDate(r.licenseExpiry)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full", u.bg, u.text)}>
                          <Icon className="w-3 h-3" /> {u.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 pr-5 text-right">
                        <Button variant="outline" size="sm" className="h-7 text-xs text-emerald-600 border-emerald-100 hover:bg-emerald-50"
                          onClick={() => startRenewal(r)}>
                          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Start renewal
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
