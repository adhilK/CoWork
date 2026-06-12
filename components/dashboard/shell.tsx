"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Calendar, Users, FileText, BarChart3,
  Settings, LogOut, Menu, Building2, Bell,
  CreditCard, UserCheck, MessageSquare, Search, Tag, X, Mailbox, MessageCircle, FolderLock, MapPin, Zap,
} from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { CommandPalette } from "@/components/shared/command-palette";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

const NAV_ITEMS: { href: string; label: string; icon: any; exact?: boolean; badge?: string }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/bookings", label: "Bookings", icon: Calendar },
  { href: "/dashboard/resources", label: "Resources", icon: Building2 },
  { href: "/dashboard/locations", label: "Locations", icon: MapPin, badge: "NEW" },
  { href: "/dashboard/members", label: "Members", icon: Users },
  { href: "/dashboard/plans", label: "Plans", icon: Tag },
  { href: "/dashboard/visitors", label: "Visitors", icon: UserCheck },
  { href: "/dashboard/invoices", label: "Invoices", icon: FileText },
  { href: "/dashboard/documents", label: "Documents", icon: FolderLock, badge: "NEW" },
  { href: "/dashboard/virtual-office", label: "Virtual Office", icon: Mailbox },
  { href: "/dashboard/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/automations", label: "Automations", icon: Zap, badge: "NEW" },
  { href: "/dashboard/community", label: "Community", icon: MessageSquare },
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

  const SidebarContent = () => (
    <div className="flex flex-col h-full px-3 py-4">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-2 mb-4 flex-shrink-0">
        <div className="w-7 h-7 rounded-[9px] flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #22C55E, #15803D)" }}>
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <span className="text-white font-semibold text-[15px] tracking-tight">CoWork Pro</span>
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

      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] px-2 mb-2 flex-shrink-0"
        style={{ color: "rgba(255,255,255,0.25)" }}>Navigation</p>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto space-y-1 -mx-1 px-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                "group flex items-center gap-3 pl-1.5 pr-3 py-1.5 rounded-2xl text-[13.5px] font-medium transition-all duration-150",
                active ? "bg-white text-gray-900 shadow-sm" : "text-white/55 hover:text-white hover:bg-white/[0.05]"
              )}>
              <span className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                active ? "bg-gray-900 text-white" : "bg-white/[0.07] text-white/65 group-hover:bg-white/[0.12]"
              )}>
                <item.icon style={{ width: 15, height: 15 }} />
              </span>
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: "rgba(34,197,94,0.18)", color: "#4ADE80" }}>{item.badge}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="pt-3 mt-2 space-y-1 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <Link href="/dashboard/settings"
          className={cn(
            "group flex items-center gap-3 pl-1.5 pr-3 py-1.5 rounded-2xl text-[13.5px] font-medium transition-all",
            isActive("/dashboard/settings") ? "bg-white text-gray-900 shadow-sm" : "text-white/55 hover:text-white hover:bg-white/[0.05]"
          )}>
          <span className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
            isActive("/dashboard/settings") ? "bg-gray-900 text-white" : "bg-white/[0.07] text-white/65 group-hover:bg-white/[0.12]")}>
            <Settings style={{ width: 15, height: 15 }} />
          </span>
          <span>Settings</span>
        </Link>
        <button onClick={handleSignOut}
          className="group w-full flex items-center gap-3 pl-1.5 pr-3 py-1.5 rounded-2xl text-[13.5px] font-medium text-white/55 hover:text-red-400 hover:bg-white/[0.05] transition-all">
          <span className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-white/[0.07] text-white/65 group-hover:bg-red-500/15 group-hover:text-red-400">
            <LogOut style={{ width: 15, height: 15 }} />
          </span>
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
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar — full height */}
      <aside className="hidden lg:flex flex-col flex-shrink-0" style={{ width: 252, background: "#0A0F0A" }}>
        <SidebarContent />
      </aside>

        {/* Mobile Overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 flex flex-col" style={{ width: 256, background: "#0A0F0A" }}>
              <SidebarContent />
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
          {[
            { href: "/dashboard", label: "Home", icon: LayoutDashboard, exact: true },
            { href: "/dashboard/bookings", label: "Bookings", icon: Calendar },
            { href: "/dashboard/resources", label: "Spaces", icon: Building2 },
            { href: "/dashboard/members", label: "Members", icon: Users },
          ].map((item) => {
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
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
}
