"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Calendar, Users, FileText, BarChart3,
  Settings, LogOut, Menu, Building2, Bell,
  CreditCard, UserCheck, MessageSquare, Search, Tag, X, Mailbox, MessageCircle, FolderLock, MapPin, Zap, Landmark, Stamp, Handshake,
} from "lucide-react";
import { MaktabyLogo } from "@/components/ui/maktaby-logo";
import { cn, initials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { CommandPalette } from "@/components/shared/command-palette";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { can, ROLE_LABELS, type Capability } from "@/lib/permissions";
import { RoleWelcome } from "@/components/dashboard/role-welcome";
import type { Plan, UserRole } from "@prisma/client";

type Props = {
  user: { id: string; email: string; name: string | null; avatar: string | null };
  organization: {
    id: string; name: string; slug: string; plan: Plan;
    currency: string; timezone: string;
    trialEndsAt: Date | null; platformSubscriptionStatus: string | null;
  };
  role: UserRole;
  children: React.ReactNode;
};

type NavItem = { href: string; label: string; icon: any; exact?: boolean; cap: Capability };

// Grouped navigation — keeps each section short and scannable instead of one
// long flat list. Empty sections (after role filtering) are hidden.
const NAV_SECTIONS: { label: string | null; items: NavItem[] }[] = [
  {
    label: null,
    items: [{ href: "/dashboard", label: "Home", icon: LayoutDashboard, exact: true, cap: "dashboard" }],
  },
  {
    label: "Workspace",
    items: [
      { href: "/dashboard/bookings", label: "Bookings", icon: Calendar, cap: "bookings" },
      { href: "/dashboard/resources", label: "Resources", icon: Building2, cap: "resources" },
      { href: "/dashboard/visitors", label: "Visitors", icon: UserCheck, cap: "visitors" },
    ],
  },
  {
    label: "Members & Billing",
    items: [
      { href: "/dashboard/members", label: "Members", icon: Users, cap: "members" },
      { href: "/dashboard/plans", label: "Plans", icon: Tag, cap: "plans" },
      { href: "/dashboard/invoices", label: "Invoices", icon: FileText, cap: "invoices" },
    ],
  },
  {
    label: "Business Services",
    items: [
      { href: "/dashboard/business-setup/leads", label: "Business Setup", icon: Landmark, cap: "businessSetup" },
      { href: "/dashboard/pro-services", label: "PRO Services", icon: Stamp, cap: "proServices" },
      { href: "/dashboard/virtual-office", label: "Virtual Office", icon: Mailbox, cap: "virtualOffice" },
      { href: "/dashboard/documents", label: "Documents", icon: FolderLock, cap: "documents" },
      { href: "/dashboard/partners", label: "Partners", icon: Handshake, cap: "partners" },
    ],
  },
  {
    label: "Grow",
    items: [
      { href: "/dashboard/whatsapp", label: "WhatsApp", icon: MessageCircle, cap: "whatsapp" },
      { href: "/dashboard/community", label: "Community", icon: MessageSquare, cap: "community" },
      { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, cap: "analytics" },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/dashboard/locations", label: "Locations", icon: MapPin, cap: "locations" },
      { href: "/dashboard/automations", label: "Automations", icon: Zap, cap: "automations" },
    ],
  },
];

const PLAN_COLORS: Record<Plan, string> = {
  STARTER: "rgba(99,102,241,0.15)",
  GROWTH: "rgba(34,197,94,0.15)",
  PRO: "rgba(234,179,8,0.15)",
  ENTERPRISE: "rgba(239,68,68,0.15)",
};
const PLAN_TEXT: Record<Plan, string> = {
  STARTER: "#818CF8",
  GROWTH: "#4ADE80",
  PRO: "#FDE047",
  ENTERPRISE: "#F87171",
};

export function DashboardShell({ user, organization, role, children }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const supabase = createClient();

  // Filter navigation to what this role is allowed to see; drop empty sections.
  const visibleSections = NAV_SECTIONS
    .map((s) => ({ label: s.label, items: s.items.filter((item) => can(role, item.cap)) }))
    .filter((s) => s.items.length > 0);
  const canSettings = can(role, "settings");

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  const trialDaysLeft = organization.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(organization.trialEndsAt).getTime() - Date.now()) / 86400000))
    : null;
  const showTrial = trialDaysLeft !== null && trialDaysLeft <= 14 && organization.platformSubscriptionStatus !== "ACTIVE";

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  // NOTE: rendered as a function call — `{sidebar()}` — NOT as `<Sidebar />`.
  // Defining a component inside another and mounting it as an element gives it
  // a new type identity on every parent render (which happens on every route
  // change via usePathname), so React unmounts/remounts the whole subtree and
  // the nav's scroll position jumps back to the top. Calling it as a function
  // inlines the JSX so it reconciles in place and scroll is preserved. It uses
  // no hooks, so calling it (even twice) is safe.
  const sidebar = () => (
    <div className="flex flex-col h-full px-3 py-4">
      {/* Brand */}
      <div className="flex items-center justify-center px-2 mb-5 flex-shrink-0">
        <MaktabyLogo variant="sidebar" size="sm" />
      </div>

      {/* Workspace card */}
      <Link href="/dashboard/settings"
        className="flex items-center gap-2.5 px-2.5 py-2 mb-3 rounded-2xl transition-colors hover:bg-white/[0.04] flex-shrink-0"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #16A34A, #166534)" }}>
          <span className="text-[11px] font-bold text-white">{initials(organization.name)}</span>
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[10px] leading-none" style={{ color: "rgba(255,255,255,0.4)" }}>Workspace</p>
          <p className="text-[13px] font-semibold text-white truncate leading-tight mt-0.5">{organization.name}</p>
        </div>
        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold flex-shrink-0"
          style={{ background: PLAN_COLORS[organization.plan], color: PLAN_TEXT[organization.plan] }}>
          {organization.plan}
        </span>
      </Link>

      {/* Search */}
      <button onClick={() => setCmdOpen(true)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 mb-4 rounded-2xl transition-colors hover:bg-white/[0.08] flex-shrink-0"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <Search style={{ width: 14, height: 14, color: "rgba(255,255,255,0.35)" }} />
        <span className="text-xs flex-1 text-left" style={{ color: "rgba(255,255,255,0.35)" }}>Search...</span>
        <kbd className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)" }}>⌘K</kbd>
      </button>

      {/* Nav — grouped sections */}
      <nav className="flex-1 overflow-y-auto -mx-1 px-1">
        {visibleSections.map((section, si) => (
          <div key={section.label ?? `s-${si}`} className={section.label ? "mt-4 first:mt-0" : ""}>
            {section.label && (
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] px-2.5 mb-1.5"
                style={{ color: "rgba(255,255,255,0.28)" }}>{section.label}</p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href, item.exact);
                return (
                  <Link key={item.href} href={item.href}
                    className={cn(
                      "group flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] font-medium transition-colors",
                      active ? "bg-white text-gray-900 shadow-sm" : "text-white/60 hover:text-white hover:bg-white/[0.06]"
                    )}>
                    <item.icon className={cn("flex-shrink-0 transition-colors", active ? "text-emerald-600" : "text-white/45 group-hover:text-white/80")}
                      style={{ width: 17, height: 17 }} />
                    <span className="flex-1">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="pt-2 mt-2 space-y-0.5 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {canSettings && (
          <Link href="/dashboard/settings"
            className={cn(
              "group flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] font-medium transition-colors",
              isActive("/dashboard/settings") ? "bg-white text-gray-900 shadow-sm" : "text-white/60 hover:text-white hover:bg-white/[0.06]"
            )}>
            <Settings className={cn("flex-shrink-0", isActive("/dashboard/settings") ? "text-emerald-600" : "text-white/45 group-hover:text-white/80")}
              style={{ width: 17, height: 17 }} />
            <span>Settings</span>
          </Link>
        )}
        <button onClick={handleSignOut}
          className="group w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] font-medium text-white/60 hover:text-red-400 hover:bg-white/[0.06] transition-colors">
          <LogOut className="flex-shrink-0 text-white/45 group-hover:text-red-400" style={{ width: 17, height: 17 }} />
          <span>Sign out</span>
        </button>

        {/* User card */}
        <div className="flex items-center gap-2.5 mt-2 px-2 py-2 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.04)" }}>
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarImage src={user.avatar ?? undefined} />
            <AvatarFallback className="text-[11px] font-bold" style={{ background: "#15803D", color: "#BBF7D0" }}>
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="overflow-hidden flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate leading-tight">{user.name ?? "You"}</p>
            <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>{user.email}</p>
          </div>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
            style={{ background: "rgba(34,197,94,0.15)", color: "#4ADE80" }}>
            {ROLE_LABELS[role] ?? role}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <RoleWelcome role={role} userId={user.id} userName={user.name} />
      {/* Desktop Sidebar — full height */}
      <aside className="hidden lg:flex flex-col flex-shrink-0" style={{ width: 252, background: "#0A0F0A" }}>
        {sidebar()}
      </aside>

        {/* Mobile Overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 flex flex-col" style={{ width: 256, background: "#0A0F0A" }}>
              {sidebar()}
            </aside>
          </div>
        )}

        {/* Content — full screen */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden workspace-bg">
          {/* Header — transparent, sits on the content */}
          <header className="flex items-center justify-between px-4 sm:px-5 lg:px-6 flex-shrink-0 border-b border-black/5" style={{ height: 60 }}>
            <button className="lg:hidden p-1.5 rounded-lg hover:bg-black/5 transition-colors"
              onClick={() => setMobileOpen(true)}>
              <Menu className="w-5 h-5 text-gray-700" />
            </button>
            <div className="flex-1" />

            {showTrial && (
              <Link href="/dashboard/billing"
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 mr-2 rounded-full text-xs font-semibold"
                style={{ background: "rgba(245,158,11,0.1)", color: "#B45309" }}>
                ⏱ {trialDaysLeft} days left — Upgrade
              </Link>
            )}

            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger className="w-9 h-9 rounded-full flex items-center justify-center bg-white border border-gray-100 hover:bg-gray-50 transition-colors shadow-sm">
                  <Bell className="w-4 h-4 text-gray-500" />
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 p-0">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">Notifications</p>
                  </div>
                  <div className="px-4 py-8 text-center">
                    <Bell className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 font-medium">You're all caught up</p>
                    <p className="text-xs text-gray-400 mt-0.5">New bookings and invoices will show here.</p>
                  </div>
                </PopoverContent>
              </Popover>
              <Avatar className="w-9 h-9 cursor-pointer border-2 border-white shadow-sm">
                <AvatarImage src={user.avatar ?? undefined} />
                <AvatarFallback className="text-[11px] font-bold bg-green-100 text-green-700">
                  {initials(user.name)}
                </AvatarFallback>
              </Avatar>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-y-auto px-4 sm:px-5 lg:px-6 py-5 lg:py-6 pb-24 lg:pb-6">
            {children}
          </main>
        </div>

      {/* ── Mobile bottom navigation bar ───────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 lg:hidden z-40 bg-white border-t border-gray-100"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-center justify-around px-1 py-1.5">
          {([
            { href: "/dashboard", label: "Home", icon: LayoutDashboard, exact: true, cap: "dashboard" as Capability },
            { href: "/dashboard/bookings", label: "Bookings", icon: Calendar, cap: "bookings" as Capability },
            { href: "/dashboard/resources", label: "Spaces", icon: Building2, cap: "resources" as Capability },
            { href: "/dashboard/members", label: "Members", icon: Users, cap: "members" as Capability },
            { href: "/dashboard/visitors", label: "Visitors", icon: UserCheck, cap: "visitors" as Capability },
          ].filter((item) => can(role, item.cap)).slice(0, 4)).map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link key={item.href} href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors",
                  active ? "text-emerald-600" : "text-gray-400"
                )}>
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-semibold">{item.label}</span>
              </Link>
            );
          })}
          <button onClick={() => setMobileOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-gray-400">
            <Menu className="w-5 h-5" />
            <span className="text-[10px] font-semibold">More</span>
          </button>
        </div>
      </nav>

      {/* Global command palette (⌘K / search box) */}
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} role={role} />
    </div>
  );
}
