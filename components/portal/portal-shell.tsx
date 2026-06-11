"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarPlus,
  Clock,
  FileText,
  FolderLock,
  User,
  LogOut,
  Menu,
  Building2,
  Sparkles,
} from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";

type MemberInfo = {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
  credits: number;
  planName: string | null;
  orgName: string;
};

type Props = {
  member: MemberInfo;
  children: React.ReactNode;
};

const NAV_ITEMS = [
  { href: "/portal", label: "Home", icon: LayoutDashboard, exact: true },
  { href: "/portal/book", label: "Book a space", icon: CalendarPlus },
  { href: "/portal/my-bookings", label: "My bookings", icon: Clock },
  { href: "/portal/invoices", label: "Invoices", icon: FileText },
  { href: "/portal/documents", label: "Documents", icon: FolderLock },
  { href: "/portal/profile", label: "Profile", icon: User },
];

export function PortalShell({ member, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full px-3 py-4">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-2 mb-4 flex-shrink-0">
        <div
          className="w-7 h-7 rounded-[9px] flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #22C55E, #15803D)" }}
        >
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-white font-semibold text-[14px] tracking-tight leading-tight truncate">
            {member.orgName}
          </p>
          <p className="text-[10px] leading-none mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            Member portal
          </p>
        </div>
      </div>

      {/* Credits highlight card */}
      <div
        className="rounded-2xl p-3.5 mb-4 flex-shrink-0"
        style={{
          background: "linear-gradient(150deg, #16A34A 0%, #15803D 55%, #166534 100%)",
          boxShadow: "0 14px 30px -14px rgba(21,128,61,0.6)",
        }}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <Sparkles className="w-3 h-3 text-white/70" />
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.7)" }}>
            Credits
          </p>
        </div>
        <p className="text-2xl font-bold text-white leading-none">{member.credits}</p>
        {member.planName && (
          <p className="text-[11px] mt-1.5 font-medium" style={{ color: "rgba(255,255,255,0.65)" }}>
            {member.planName} plan
          </p>
        )}
      </div>

      {/* Primary CTA */}
      <Link
        href="/portal/book"
        className={cn(
          "flex items-center justify-center gap-2 px-3 py-2.5 mb-4 rounded-2xl text-[13.5px] font-semibold transition-all flex-shrink-0",
          isActive("/portal/book")
            ? "bg-white text-gray-900"
            : "bg-white/[0.06] text-white hover:bg-white/[0.1] border border-white/[0.06]"
        )}
      >
        <CalendarPlus className="w-4 h-4" />
        Book a space
      </Link>

      <p
        className="text-[10px] font-semibold uppercase tracking-[0.12em] px-2 mb-2 flex-shrink-0"
        style={{ color: "rgba(255,255,255,0.25)" }}
      >
        Menu
      </p>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto space-y-1 -mx-1 px-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 pl-1.5 pr-3 py-1.5 rounded-2xl text-[13.5px] font-medium transition-all duration-150",
                active
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-white/55 hover:text-white hover:bg-white/[0.05]"
              )}
            >
              <span
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                  active
                    ? "bg-gray-900 text-white"
                    : "bg-white/[0.07] text-white/65 group-hover:bg-white/[0.12]"
                )}
              >
                <item.icon style={{ width: 15, height: 15 }} />
              </span>
              <span className="flex-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom — sign out + user card */}
      <div className="pt-3 mt-2 space-y-1 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <button
          onClick={handleSignOut}
          className="group w-full flex items-center gap-3 pl-1.5 pr-3 py-1.5 rounded-2xl text-[13.5px] font-medium text-white/55 hover:text-red-400 hover:bg-white/[0.05] transition-all"
        >
          <span className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-white/[0.07] text-white/65 group-hover:bg-red-500/15 group-hover:text-red-400">
            <LogOut style={{ width: 15, height: 15 }} />
          </span>
          <span>Sign out</span>
        </button>

        <div
          className="flex items-center gap-2.5 mt-2 px-2 py-2 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.04)" }}
        >
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarImage src={member.avatar ?? undefined} />
            <AvatarFallback className="text-[11px] font-bold" style={{ background: "#15803D", color: "#BBF7D0" }}>
              {initials(member.name)}
            </AvatarFallback>
          </Avatar>
          <div className="overflow-hidden flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate leading-tight">
              {member.name ?? "Member"}
            </p>
            <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
              {member.email}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col flex-shrink-0" style={{ width: 248, background: "#0A0F0A" }}>
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 flex flex-col" style={{ width: 256, background: "#0A0F0A" }}>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden workspace-bg">
        {/* Header */}
        <header className="flex items-center justify-between px-4 sm:px-5 lg:px-6 flex-shrink-0 border-b border-black/5" style={{ height: 60 }}>
          <button
            className="lg:hidden p-1.5 rounded-lg hover:bg-black/5 transition-colors"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-5 h-5 text-gray-700" />
          </button>

          {/* Mobile brand */}
          <div className="flex lg:hidden items-center gap-2">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #22C55E, #15803D)" }}
            >
              <Building2 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-gray-900 text-sm truncate max-w-[140px]">{member.orgName}</span>
          </div>

          <div className="flex-1" />

          {/* Credits pill (always visible) */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold mr-2"
            style={{ background: "rgba(34,197,94,0.1)", color: "#15803D" }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {member.credits} credits
          </div>

          <Avatar
            className="w-9 h-9 cursor-pointer border-2 border-white shadow-sm"
            onClick={() => router.push("/portal/profile")}
          >
            <AvatarImage src={member.avatar ?? undefined} />
            <AvatarFallback className="text-[11px] font-bold bg-green-100 text-green-700">
              {initials(member.name)}
            </AvatarFallback>
          </Avatar>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-5 lg:px-6 py-5 lg:py-6 pb-24 lg:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 lg:hidden z-40 bg-white border-t border-gray-100"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-around px-1 py-1.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors",
                  active ? "text-emerald-600" : "text-gray-400"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-semibold">
                  {item.label === "Book a space" ? "Book" : item.label === "My bookings" ? "Bookings" : item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
