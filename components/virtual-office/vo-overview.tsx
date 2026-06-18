"use client";

import Link from "next/link";
import { Building2, Users, Mail, AlertTriangle, TrendingUp, Clock } from "lucide-react";
import { formatCurrency, formatDate, formatRelative, humanizeEnum } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";

type Address = {
  id: string;
  addressLine: string;
  addressType: string;
  jurisdiction: string;
  isActive: boolean;
  monthlyFee: any;
  _count: { subscriptions: number };
};

type Subscription = {
  id: string;
  companyName: string;
  status: string;
  renewalDate: Date | string | null;
  monthlyFee: any;
  currency: string;
  member: { user: { name: string | null; email: string } };
  address: { addressLine: string };
};

type MailItem = {
  id: string;
  mailType: string;
  senderName: string | null;
  receivedAt: Date | string;
  collectedAt: Date | string | null;
  subscription: { companyName: string; member: { user: { name: string | null } } } | null;
  address: { addressLine: string };
};

type Props = {
  addresses: Address[];
  subscriptions: Subscription[];
  recentMail: MailItem[];
  currency: string;
  stats: {
    totalAddresses: number;
    activeSubscriptions: number;
    pendingMailCount: number;
    renewingSoonCount: number;
    monthlyRevenue: number;
  };
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: "bg-green-50", text: "text-green-700" },
  PENDING_RENEWAL: { bg: "bg-amber-50", text: "text-amber-700" },
  EXPIRED: { bg: "bg-red-50", text: "text-red-700" },
  CANCELLED: { bg: "bg-gray-100", text: "text-gray-500" },
};

const MAIL_ICONS: Record<string, string> = {
  LEGAL_DOCUMENT: "⚖️",
  GOVERNMENT_CORRESPONDENCE: "🏛️",
  PACKAGE: "📦",
  COURIER: "🚚",
  LETTER: "✉️",
  OTHER: "📄",
};

export function VOOverview({ addresses, subscriptions, recentMail, currency, stats }: Props) {
  const renewingSoon = subscriptions.filter(
    (s) => s.renewalDate && new Date(s.renewalDate) <= new Date(Date.now() + 30 * 86400000)
  );

  // First-run: nothing set up yet → guide the operator to create their first address.
  const isFirstRun =
    stats.totalAddresses === 0 && subscriptions.length === 0 && recentMail.length === 0;

  if (isFirstRun) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="page-title">Virtual Office</h1>
          <p className="page-subtitle">Manage registered addresses, subscriptions, and mail</p>
        </div>
        <EmptyState
          icon={Building2}
          title="Sell registered business addresses"
          description="Virtual office is one of the highest-margin services for GCC operators. Offer a prestigious registered address, then manage client subscriptions and incoming mail from here."
          steps={[
            "Add a registered address (mainland, freezone, or premium district).",
            "Subscribe clients and set their monthly renewal.",
            "Log mail and packages — clients get notified to collect.",
          ]}
          primary={{ label: "Add your first address", href: "/dashboard/virtual-office/addresses" }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Virtual Office</h1>
        <p className="page-subtitle">Manage registered addresses, subscriptions, and mail</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Addresses", value: stats.totalAddresses, icon: Building2, color: "#15803D", bg: "rgba(21,128,61,0.1)" },
          { label: "Active clients", value: stats.activeSubscriptions, icon: Users, color: "#2563EB", bg: "rgba(37,99,235,0.1)" },
          { label: "Pending mail", value: stats.pendingMailCount, icon: Mail, color: "#D97706", bg: "rgba(217,119,6,0.1)" },
          { label: "Renewing soon", value: stats.renewingSoonCount, icon: AlertTriangle, color: "#DC2626", bg: "rgba(220,38,38,0.1)" },
        ].map((stat) => (
          <div key={stat.label} className="dashboard-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: stat.bg }}>
                <stat.icon style={{ width: 18, height: 18, color: stat.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Monthly revenue card */}
      <div className="dashboard-card p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(21,128,61,0.12)" }}>
          <TrendingUp style={{ width: 20, height: 20, color: "#15803D" }} />
        </div>
        <div>
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Monthly virtual office revenue</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.monthlyRevenue, currency)}</p>
        </div>
        <div className="flex-1" />
        <Link href="/dashboard/virtual-office/subscriptions"
          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
          View all subscriptions →
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Addresses */}
        <div className="dashboard-card">
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">Addresses</h2>
            <Link href="/dashboard/virtual-office/addresses"
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold">Manage →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {addresses.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <Building2 className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No addresses yet</p>
                <Link href="/dashboard/virtual-office/addresses"
                  className="text-xs text-emerald-600 mt-1 inline-block">Add first address →</Link>
              </div>
            ) : addresses.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-50">
                  <Building2 className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{a.addressLine}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {humanizeEnum(a.addressType)} · {a.jurisdiction}
                    {a._count.subscriptions > 0 && ` · ${a._count.subscriptions} active`}
                  </p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${a.isActive ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                  {a.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Renewals due */}
        <div className="dashboard-card">
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">Renewals due <span className="text-[11px] font-normal text-gray-400">(next 30 days)</span></h2>
            <Link href="/dashboard/virtual-office/subscriptions?status=PENDING_RENEWAL"
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold">View all →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {renewingSoon.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <Clock className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No renewals due soon</p>
              </div>
            ) : renewingSoon.map((s) => {
              const colors = STATUS_COLORS[s.status] ?? { bg: "bg-gray-100", text: "text-gray-500" };
              return (
                <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{s.companyName}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {s.member.user.name ?? s.member.user.email} · renews {formatDate(s.renewalDate)}
                    </p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                    {humanizeEnum(s.status)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent mail */}
      <div className="dashboard-card">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-900">Recent mail</h2>
          <Link href="/dashboard/virtual-office/mail"
            className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold">Full log →</Link>
        </div>
        {recentMail.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <Mail className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No mail logged yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentMail.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                <span className="text-lg flex-shrink-0">{MAIL_ICONS[m.mailType] ?? "📄"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {m.subscription?.companyName ?? m.address.addressLine}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {m.senderName ? `From: ${m.senderName} · ` : ""}{humanizeEnum(m.mailType)} · {formatRelative(m.receivedAt)}
                  </p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${m.collectedAt ? "bg-gray-100 text-gray-400" : "bg-amber-50 text-amber-600"}`}>
                  {m.collectedAt ? "Collected" : "Pending"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
