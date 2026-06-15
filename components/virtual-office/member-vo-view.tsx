"use client";

import { Building2, Mail, Clock, FileText } from "lucide-react";
import { formatCurrency, formatDate, formatRelative, humanizeEnum } from "@/lib/utils";

type Subscription = {
  id: string;
  companyName: string;
  licenseNumber: string | null;
  licenseExpiry: Date | string | null;
  startDate: Date | string;
  renewalDate: Date | string | null;
  status: string;
  monthlyFee: any;
  currency: string;
  address: {
    addressLine: string;
    addressType: string;
    jurisdiction: string;
    freezoneName: string | null;
  };
};

type MailItem = {
  id: string;
  mailType: string;
  senderName: string | null;
  receivedAt: Date | string;
  collectedAt: Date | string | null;
  forwardedAt: Date | string | null;
  description: string | null;
  trackingNumber: string | null;
};

type Props = {
  subscriptions: Subscription[];
  recentMail: MailItem[];
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  ACTIVE: { bg: "bg-green-50", text: "text-green-700", label: "Active" },
  PENDING_RENEWAL: { bg: "bg-amber-50", text: "text-amber-700", label: "Renewal Due" },
  EXPIRED: { bg: "bg-red-50", text: "text-red-600", label: "Expired" },
  CANCELLED: { bg: "bg-gray-100", text: "text-gray-500", label: "Cancelled" },
};

const MAIL_ICONS: Record<string, string> = {
  LEGAL_DOCUMENT: "⚖️",
  GOVERNMENT_CORRESPONDENCE: "🏛️",
  PACKAGE: "📦",
  COURIER: "🚚",
  LETTER: "✉️",
  OTHER: "📄",
};

export function MemberVOView({ subscriptions, recentMail }: Props) {
  const pendingMail = recentMail.filter((m) => !m.collectedAt && !m.forwardedAt);

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Virtual Office</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your registered address subscriptions and mail</p>
      </div>

      {subscriptions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">No virtual office subscriptions</p>
          <p className="text-xs text-gray-400 mt-1">Contact your space manager to set up a registered address.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {subscriptions.map((s) => {
            const st = STATUS_STYLES[s.status] ?? { bg: "bg-gray-100", text: "text-gray-500", label: humanizeEnum(s.status) };
            return (
              <div key={s.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(21,128,61,0.1)" }}>
                    <Building2 style={{ width: 18, height: 18, color: "#15803D" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-semibold text-gray-900">{s.companyName}</h2>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>
                        {st.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{s.address.addressLine}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {humanizeEnum(s.address.addressType)} · {s.address.jurisdiction}
                      {s.address.freezoneName && ` · ${s.address.freezoneName}`}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Monthly fee", value: formatCurrency(s.monthlyFee, s.currency) },
                    { label: "Started", value: formatDate(s.startDate) },
                    { label: "Renewal", value: s.renewalDate ? formatDate(s.renewalDate) : "—" },
                    { label: "License", value: s.licenseNumber ?? "—" },
                  ].map((item) => (
                    <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">{item.label}</p>
                      <p className="text-xs font-bold text-gray-700 mt-1 truncate">{item.value}</p>
                    </div>
                  ))}
                </div>

                {s.licenseExpiry && (
                  <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                    <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                    License expires {formatDate(s.licenseExpiry)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Mail */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-900">Recent mail</h2>
            {pendingMail.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
                {pendingMail.length} pending
              </span>
            )}
          </div>
        </div>

        {recentMail.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <Mail className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No mail logged yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentMail.map((m) => {
              const pending = !m.collectedAt && !m.forwardedAt;
              return (
                <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="text-xl flex-shrink-0">{MAIL_ICONS[m.mailType] ?? "📄"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {humanizeEnum(m.mailType)}
                      {m.senderName && <span className="font-normal text-gray-500"> from {m.senderName}</span>}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Received {formatRelative(m.receivedAt)}
                      {m.trackingNumber && ` · #${m.trackingNumber}`}
                    </p>
                    {m.description && <p className="text-[11px] text-gray-500 mt-0.5">{m.description}</p>}
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    m.collectedAt
                      ? "bg-gray-100 text-gray-400"
                      : m.forwardedAt
                      ? "bg-blue-50 text-blue-600"
                      : "bg-amber-50 text-amber-600"
                  }`}>
                    {m.collectedAt ? "Collected" : m.forwardedAt ? "Forwarded" : "Pending"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
