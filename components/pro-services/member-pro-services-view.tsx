"use client";

import { useState } from "react";
import { FileCheck2, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { cn, formatCurrency, formatDate, formatRelative } from "@/lib/utils";
import { serviceTypeLabel, PRO_STAGE_LABELS, PRO_STAGE_META } from "@/lib/pro-services/meta";

type Req = {
  id: string; serviceType: string; serviceDescription: string | null; jurisdiction: string;
  stage: string; urgency: string; governingBody: string | null; referenceNumber: string | null;
  fee: number | null; currency: string; dueDate: string | null; completedAt: string | null;
  clientNotes: string | null; createdAt: string;
  activities: { id: string; note: string; createdAt: string }[];
};

export function MemberProServicesView({ requests }: { requests: Req[] }) {
  const [openId, setOpenId] = useState<string | null>(requests[0]?.id ?? null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">PRO Services</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track your government-liaison requests</p>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <FileCheck2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">No requests yet</p>
          <p className="text-xs text-gray-400 mt-1">Your space can process visas, attestations, and more on your behalf.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => {
            const stm = PRO_STAGE_META[r.stage as keyof typeof PRO_STAGE_META] ?? PRO_STAGE_META.SUBMITTED;
            const expanded = openId === r.id;
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button onClick={() => setOpenId(expanded ? null : r.id)} className="w-full flex items-center gap-3 px-5 py-4 text-left">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(21,128,61,0.1)" }}>
                    <FileCheck2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{serviceTypeLabel(r.serviceType)}</p>
                    <p className="text-[11px] text-gray-400">
                      {r.governingBody ? `${r.governingBody} · ` : ""}{r.referenceNumber ? `Ref ${r.referenceNumber} · ` : ""}Started {formatDate(r.createdAt)}
                    </p>
                  </div>
                  <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0", stm.bg, stm.text)}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: stm.dot }} />
                    {PRO_STAGE_LABELS[r.stage as keyof typeof PRO_STAGE_LABELS]}
                  </span>
                  {expanded ? <ChevronUp className="w-4 h-4 text-gray-300" /> : <ChevronDown className="w-4 h-4 text-gray-300" />}
                </button>

                {expanded && (
                  <div className="px-5 pb-5 border-t border-gray-50 pt-3 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: "Fee", value: r.fee != null ? formatCurrency(r.fee, r.currency) : "—" },
                        { label: "Expected by", value: r.dueDate ? formatDate(r.dueDate) : "—" },
                        { label: "Jurisdiction", value: r.jurisdiction },
                        { label: "Completed", value: r.completedAt ? formatDate(r.completedAt) : "—" },
                      ].map((it) => (
                        <div key={it.label} className="bg-gray-50 rounded-xl p-3">
                          <p className="text-[10px] text-gray-400 font-semibold uppercase">{it.label}</p>
                          <p className="text-xs font-bold text-gray-700 mt-1">{it.value}</p>
                        </div>
                      ))}
                    </div>

                    {r.clientNotes && (
                      <div className="bg-emerald-50/50 rounded-xl p-3">
                        <p className="text-xs text-emerald-800">{r.clientNotes}</p>
                      </div>
                    )}

                    <div>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase mb-2">Updates</p>
                      {r.activities.length === 0 ? (
                        <p className="text-xs text-gray-400">No updates yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {r.activities.map((a) => (
                            <div key={a.id} className="flex items-start gap-2">
                              <Clock className="w-3.5 h-3.5 text-gray-300 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm text-gray-700">{a.note}</p>
                                <p className="text-[11px] text-gray-400">{formatRelative(a.createdAt)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
