"use client";

import Link from "next/link";
import { ArrowLeft, Briefcase, CheckCircle2, Clock, FileText, ExternalLink } from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Step = { step: string; status: string };

type Proposal = {
  status: string;
  totalFee: number;
  currency: string;
  validUntil: string;
  publicToken: string | null;
  acceptedAt: string | null;
};

type Application = {
  steps: Step[];
  licenseNumber: string | null;
  licenseExpiry: string | null;
  referenceNumber: string | null;
  approvedAt: string | null;
};

type Lead = {
  id: string;
  companyName: string | null;
  licenseType: string;
  jurisdiction: string;
  stage: string;
  estimatedFee: number | null;
  quotedFee: number | null;
  currency: string;
  createdAt: string;
  proposal: Proposal | null;
  application: Application | null;
};

type Props = { leads: Lead[] };

const STAGE_LABELS: Record<string, string> = {
  NEW_ENQUIRY: "New enquiry",
  QUALIFIED: "Qualified",
  PROPOSAL_SENT: "Proposal sent",
  DOCUMENTS_COLLECTION: "Documents required",
  SUBMITTED_TO_AUTHORITY: "Submitted",
  AWAITING_APPROVAL: "Awaiting approval",
  APPROVED: "Approved",
  COMPLETED: "Completed",
  LOST: "Closed",
};

const STAGE_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  NEW_ENQUIRY:           { bg: "bg-gray-100",   text: "text-gray-500",    dot: "#9CA3AF" },
  QUALIFIED:             { bg: "bg-blue-50",    text: "text-blue-600",    dot: "#2563EB" },
  PROPOSAL_SENT:         { bg: "bg-violet-50",  text: "text-violet-600",  dot: "#7C3AED" },
  DOCUMENTS_COLLECTION:  { bg: "bg-amber-50",   text: "text-amber-700",   dot: "#D97706" },
  SUBMITTED_TO_AUTHORITY:{ bg: "bg-sky-50",     text: "text-sky-600",     dot: "#0284C7" },
  AWAITING_APPROVAL:     { bg: "bg-orange-50",  text: "text-orange-600",  dot: "#EA580C" },
  APPROVED:              { bg: "bg-emerald-50", text: "text-emerald-600", dot: "#059669" },
  COMPLETED:             { bg: "bg-green-50",   text: "text-green-700",   dot: "#15803D" },
  LOST:                  { bg: "bg-gray-100",   text: "text-gray-400",    dot: "#D1D5DB" },
};

const PROPOSAL_STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  DRAFT:     { bg: "bg-gray-100",   text: "text-gray-500"  },
  SENT:      { bg: "bg-blue-50",    text: "text-blue-600"  },
  ACCEPTED:  { bg: "bg-green-50",   text: "text-green-700" },
  REJECTED:  { bg: "bg-red-50",     text: "text-red-600"   },
  EXPIRED:   { bg: "bg-gray-100",   text: "text-gray-400"  },
};

function StepProgress({ steps }: { steps: Step[] }) {
  if (!steps.length) return null;
  const done = steps.filter((s) => s.status === "COMPLETED").length;
  const pct = Math.round((done / steps.length) * 100);
  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-center justify-between text-[11px] text-gray-500">
        <span>Application progress</span>
        <span className="font-semibold">{done}/{steps.length} steps</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function BusinessSetupPortalView({ leads }: Props) {
  if (leads.length === 0) {
    return (
      <div className="space-y-5">
        <Link href="/portal" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to portal
        </Link>
        <div className="dashboard-card p-12 text-center">
          <Briefcase className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">No business setup applications</p>
          <p className="text-xs text-gray-400 mt-1">Contact your workspace team to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link href="/portal" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to portal
      </Link>
      <div>
        <h1 className="page-title">Business Setup</h1>
        <p className="page-subtitle">Track your company formation and license applications</p>
      </div>

      <div className="space-y-4">
        {leads.map((lead) => {
          const stm = (STAGE_STYLE[lead.stage] ?? STAGE_STYLE.NEW_ENQUIRY)!;
          const stageLabel = STAGE_LABELS[lead.stage] ?? lead.stage;
          const app = lead.application;
          const prop = lead.proposal;
          const steps = app?.steps ?? [];

          return (
            <div key={lead.id} className="dashboard-card p-5 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-semibold text-gray-900">
                    {lead.companyName ?? "Unnamed company"}
                  </p>
                  <p className="text-[12px] text-gray-400 mt-0.5">
                    {lead.licenseType.replace(/_/g, " ")} · {lead.jurisdiction} · Started {formatDate(lead.createdAt)}
                  </p>
                </div>
                <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0", stm.bg, stm.text)}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: stm.dot }} />
                  {stageLabel}
                </span>
              </div>

              {/* Proposal section */}
              {prop && (
                <div className="border border-gray-100 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">Proposal</span>
                      <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", PROPOSAL_STATUS_STYLE[prop.status]?.bg ?? "bg-gray-100", PROPOSAL_STATUS_STYLE[prop.status]?.text ?? "text-gray-400")}>
                        {prop.status}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(prop.totalFee, prop.currency)}
                    </span>
                  </div>
                  {prop.status === "ACCEPTED" && prop.acceptedAt && (
                    <p className="text-[11px] text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Accepted on {formatDate(prop.acceptedAt)}
                    </p>
                  )}
                  {prop.status === "SENT" && prop.publicToken && (
                    <Link href={`/proposals/${prop.publicToken}`} target="_blank"
                      className="inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-600 hover:text-emerald-700">
                      <ExternalLink className="w-3.5 h-3.5" /> Review & accept proposal
                    </Link>
                  )}
                  {prop.status === "SENT" && (
                    <p className="text-[11px] text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Valid until {formatDate(prop.validUntil)}
                    </p>
                  )}
                </div>
              )}

              {/* Application section */}
              {app && (
                <div className="border border-gray-100 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Application</span>
                    {app.referenceNumber && (
                      <span className="text-[11px] font-mono text-gray-400">#{app.referenceNumber}</span>
                    )}
                  </div>
                  {app.approvedAt && (
                    <p className="text-[11px] text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approved {formatDate(app.approvedAt)}
                    </p>
                  )}
                  {app.licenseNumber && (
                    <p className="text-[12px] text-gray-700">
                      License: <strong className="font-mono">{app.licenseNumber}</strong>
                      {app.licenseExpiry && <span className="text-gray-400"> · expires {formatDate(app.licenseExpiry)}</span>}
                    </p>
                  )}
                  {steps.length > 0 && <StepProgress steps={steps} />}
                </div>
              )}

              {/* Fee summary if no proposal yet */}
              {!prop && (lead.estimatedFee != null || lead.quotedFee != null) && (
                <p className="text-[12px] text-gray-500">
                  Estimated fee:{" "}
                  <strong>{formatCurrency(lead.quotedFee ?? lead.estimatedFee ?? 0, lead.currency)}</strong>
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
