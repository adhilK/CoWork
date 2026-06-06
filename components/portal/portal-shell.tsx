"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Clock,
  FileText,
  User,
  LogOut,
  Menu,
  Building2,
  X,
} from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  { href: "/portal/book", label: "Book a space", icon: Calendar },
  { href: "/portal/my-bookings", label: "My bookings", icon: Clock },
  { href: "/portal/invoices", label: "Invoices", icon: FileText },
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
    <div className="flex flex-col h-full">
      {/* Logo / org name */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-5 flex-shrink-0 border-b border-gray-100">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}
        >
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <div className="overflow-hidden flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm leading-tight truncate">
            {member.orgName}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">Member portal</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5 mt-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                active
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              <item.icon
                className={cn(
                  "w-4 h-4 flex-shrink-0",
                  active ? "text-emerald-600" : "text-gray-400"
                )}
              />
              <span>{item.label}</span>
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-4 border-t border-gray-100" />

      {/* Sign out */}
      <div className="p-3">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all duration-150 w-full"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span>Sign out</span>
        </button>
      </div>

      {/* Member card */}
      <div className="px-4 pb-5 flex-shrink-0">
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
          <div className="flex items-center gap-3">
            <Avatar className="w-9 h-9 flex-shrink-0">
              <AvatarImage src={member.avatar ?? undefined} />
              <AvatarFallback className="text-xs font-bold bg-emerald-100 text-emerald-700">
                {initials(member.name)}
              </AvatarFallback>
            </Avatar>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-gray-900 text-sm font-semibold truncate leading-tight">
                {member.name ?? "Member"}
              </p>
              <p className="text-[11px] text-gray-400 truncate">{member.email}</p>
            </div>
          </div>
          {member.planName && (
            <div className="mt-2.5 flex items-center gap-2">
              <Badge
                variant="secondary"
                className="text-[11px] bg-emerald-50 text-emerald-700 border-emerald-100 px-2 py-0.5"
              >
                {member.planName}
              </Badge>
              <span className="text-[11px] text-gray-400">
                {member.credits} credit{member.credits !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50/50">
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col flex-shrink-0 bg-white border-r border-gray-100"
        style={{ width: 240 }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="absolute left-0 top-0 bottom-0 flex flex-col bg-white"
            style={{ width: 240 }}
          >
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 flex items-center justify-between px-5 flex-shrink-0 h-[60px]">
          <button
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1 lg:hidden" />
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}
            >
              <Building2 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-gray-900 text-sm">Member Portal</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <Avatar className="w-7 h-7 cursor-pointer" onClick={() => router.push("/portal/profile")}>
              <AvatarImage src={member.avatar ?? undefined} />
              <AvatarFallback className="text-[10px] font-bold bg-emerald-100 text-emerald-700">
                {initials(member.name)}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6 pb-24 lg:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 lg:hidden z-40 bg-white border-t border-gray-100"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-center justify-around px-1 py-1.5">
          {NAV_ITEMS.slice(0, 4).map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link key={item.href} href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors",
                  active ? "text-emerald-600" : "text-gray-400"
                )}>
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-semibold">{item.label === "Book a space" ? "Book" : item.label}</span>
              </Link>
            );
          })}
          <Link href="/portal/profile"
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors",
              isActive("/portal/profile") ? "text-emerald-600" : "text-gray-400"
            )}>
            <User className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
