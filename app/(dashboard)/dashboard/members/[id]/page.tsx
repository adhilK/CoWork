import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ChevronLeft, Mail, Phone, Building, Briefcase, CreditCard, CalendarDays, Banknote, Receipt } from "lucide-react";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, initials, humanizeEnum, cn } from "@/lib/utils";
import { MemberDetailActions } from "@/components/members/member-detail-actions";
import { format } from "date-fns";

export const metadata: Metadata = { title: "Member — CoWork Pro" };
export const dynamic = "force-dynamic";

const MEMBER_STATUS: Record<string, { label: string; bg: string; text: string }> = {
  ACTIVE: { label: "Active", bg: "bg-emerald-50", text: "text-emerald-700" },
  PENDING: { label: "Pending", bg: "bg-amber-50", text: "text-amber-700" },
  INACTIVE: { label: "Inactive", bg: "bg-gray-100", text: "text-gray-500" },
  SUSPENDED: { label: "Suspended", bg: "bg-red-50", text: "text-red-600" },
};

const BOOKING_STATUS: Record<string, { bg: string; text: string; solid: string }> = {
  PENDING: { bg: "bg-amber-50", text: "text-amber-700", solid: "#F59E0B" },
  CONFIRMED: { bg: "bg-indigo-50", text: "text-indigo-700", solid: "#6366F1" },
  CHECKED_IN: { bg: "bg-emerald-50", text: "text-emerald-700", solid: "#16A34A" },
  COMPLETED: { bg: "bg-gray-100", text: "text-gray-500", solid: "#9CA3AF" },
  CANCELLED: { bg: "bg-red-50", text: "text-red-600", solid: "#EF4444" },
  NO_SHOW: { bg: "bg-orange-50", text: "text-orange-600", solid: "#F97316" },
};
const DEFAULT_BS = BOOKING_STATUS.CONFIRMED!;

const INVOICE_STATUS: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: "bg-gray-100", text: "text-gray-600" },
  PENDING: { bg: "bg-amber-50", text: "text-amber-700" },
  PAID: { bg: "bg-emerald-50", text: "text-emerald-700" },
  OVERDUE: { bg: "bg-red-50", text: "text-red-600" },
  CANCELLED: { bg: "bg-gray-100", text: "text-gray-500" },
  REFUNDED: { bg: "bg-purple-50", text: "text-purple-700" },
};
const DEFAULT_IS = INVOICE_STATUS.PENDING!;

export default async function MemberDetailPage({ params }: { params: { id: string } }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const orgId = ctx.organizationId;
  const currency = ctx.organization.currency;

  const [member, bookings, invoices, bookingCount, paidAgg, plans] = await Promise.all([
    prisma.member.findFirst({
      where: { id: params.id, organizationId: orgId, deletedAt: null },
      include: { user: true, membershipPlan: true },
    }),
    prisma.booking.findMany({
      where: { memberId: params.id, organizationId: orgId, deletedAt: null },
      include: { resource: { select: { name: true } } },
      orderBy: { startTime: "desc" },
      take: 8,
    }),
    prisma.invoice.findMany({
      where: { memberId: params.id, organizationId: orgId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.booking.count({ where: { memberId: params.id, organizationId: orgId, deletedAt: null } }),
    prisma.invoice.aggregate({
      where: { memberId: params.id, organizationId: orgId, status: "PAID", deletedAt: null },
      _sum: { amount: true },
    }),
    prisma.membershipPlan.findMany({
      where: { organizationId: orgId, isActive: true },
      select: { id: true, name: true },
      orderBy: { price: "asc" },
    }),
  ]);

  if (!member) notFound();

  const status = MEMBER_STATUS[member.status] ?? MEMBER_STATUS.ACTIVE!;
  const totalSpent = Number(paidAgg._sum.amount ?? 0);

  const stats = [
    { icon: CreditCard, tint: "#6366F1", label: "Credits", value: String(member.credits) },
    { icon: CalendarDays, tint: "#0EA5E9", label: "Total bookings", value: String(bookingCount) },
    { icon: Banknote, tint: "#15803D", label: "Total paid", value: formatCurrency(totalSpent, currency) },
    { icon: CalendarDays, tint: "#F59E0B", label: "Member since", value: format(member.createdAt, "MMM yyyy") },
  ];

  return (
    <div className="space-y-5">
      <Link href="/dashboard/members" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors">
        <ChevronLeft className="w-4 h-4 mr-1" /> Back to members
      </Link>

      {/* Header */}
      <div className="dashboard-card p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-bold text-emerald-700">{initials(member.user.name ?? member.user.email)}</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">{member.user.name ?? "Unnamed member"}</h1>
            <p className="text-sm text-gray-400 flex items-center gap-1.5 mt-0.5">
              <Mail className="w-3.5 h-3.5" /> {member.user.email}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", status.bg, status.text)}>{status.label}</span>
              {member.membershipPlan && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600">
                  {member.membershipPlan.name} · {formatCurrency(Number(member.membershipPlan.price), currency)}/{member.membershipPlan.billingCycle.toLowerCase()}
                </span>
              )}
            </div>
          </div>
        </div>
        <MemberDetailActions
          member={{
            id: member.id,
            name: member.user.name ?? "",
            email: member.user.email,
            phone: member.phone ?? "",
            company: member.company ?? "",
            jobTitle: member.jobTitle ?? "",
            bio: member.bio ?? "",
            notes: member.notes ?? "",
            status: member.status,
            membershipPlanId: member.membershipPlanId ?? "",
            credits: member.credits,
          }}
          plans={plans}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <div key={i} className="dashboard-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${s.tint}14` }}>
                <s.icon style={{ color: s.tint, width: 15, height: 15 }} />
              </div>
              <span className="text-xs text-gray-500">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Bookings + invoices */}
        <div className="lg:col-span-2 space-y-5">
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-900">Recent bookings</h2>
            {bookings.length === 0 ? (
              <div className="dashboard-card p-8 text-center text-gray-400">
                <CalendarDays className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No bookings yet.</p>
              </div>
            ) : (
              <div className="dashboard-card divide-y divide-gray-50 overflow-hidden">
                {bookings.map((b) => {
                  const s = BOOKING_STATUS[b.status] ?? DEFAULT_BS;
                  return (
                    <div key={b.id} className="flex items-center gap-4 px-4 py-3">
                      <div className="w-14 flex-shrink-0">
                        <p className="text-xs font-semibold text-gray-900">{format(b.startTime, "d MMM")}</p>
                        <p className="text-xs text-gray-400">{format(b.startTime, "HH:mm")}</p>
                      </div>
                      <div className="w-1 self-stretch rounded-full" style={{ background: s.solid }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{b.resource.name}</p>
                        {b.title && <p className="text-xs text-gray-400 truncate">{b.title}</p>}
                      </div>
                      <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", s.bg, s.text)}>
                        {humanizeEnum(b.status)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">Invoices</h2>
              <Link href="/dashboard/invoices" className="text-xs text-indigo-600 hover:underline">All invoices →</Link>
            </div>
            {invoices.length === 0 ? (
              <div className="dashboard-card p-8 text-center text-gray-400">
                <Receipt className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No invoices yet.</p>
              </div>
            ) : (
              <div className="dashboard-card divide-y divide-gray-50 overflow-hidden">
                {invoices.map((inv) => {
                  const s = INVOICE_STATUS[inv.status] ?? DEFAULT_IS;
                  return (
                    <div key={inv.id} className="flex items-center gap-4 px-4 py-3">
                      <Receipt className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{inv.invoiceNumber ?? "Invoice"}</p>
                        <p className="text-xs text-gray-400">Due {formatDate(inv.dueDate)}</p>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{formatCurrency(Number(inv.amount), currency)}</span>
                      <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", s.bg, s.text)}>
                        {humanizeEnum(inv.status)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Profile details */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-gray-900">Profile</h2>
          <div className="dashboard-card p-4 space-y-3 text-sm">
            <Detail icon={Mail} label="Email" value={member.user.email} />
            {member.phone && <Detail icon={Phone} label="Phone" value={member.phone} />}
            {member.company && <Detail icon={Building} label="Company" value={member.company} />}
            {member.jobTitle && <Detail icon={Briefcase} label="Job title" value={member.jobTitle} />}
            <Detail icon={CalendarDays} label="Joined" value={formatDate(member.createdAt)} />
            {member.membershipPlan && <Detail icon={CreditCard} label="Plan" value={member.membershipPlan.name} />}
          </div>
          {member.bio && (
            <div className="dashboard-card p-4">
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Bio</p>
              <p className="text-sm text-gray-600">{member.bio}</p>
            </div>
          )}
          {member.notes && (
            <div className="dashboard-card p-4">
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Staff notes</p>
              <p className="text-sm text-gray-600">{member.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-gray-400 flex-shrink-0">
        <Icon className="w-3.5 h-3.5" /> {label}
      </span>
      <span className="font-medium text-gray-800 truncate text-right">{value}</span>
    </div>
  );
}
