"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";
import {
  LayoutDashboard, Calendar, Building2, Users, Tag, UserCheck, FileText,
  BarChart3, MessageSquare, Settings, CreditCard, Plus,
} from "lucide-react";

const NAV = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Bookings", href: "/dashboard/bookings", icon: Calendar },
  { label: "Resources", href: "/dashboard/resources", icon: Building2 },
  { label: "Members", href: "/dashboard/members", icon: Users },
  { label: "Plans", href: "/dashboard/plans", icon: Tag },
  { label: "Visitors", href: "/dashboard/visitors", icon: UserCheck },
  { label: "Invoices & Billing", href: "/dashboard/invoices", icon: FileText },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Community", href: "/dashboard/community", icon: MessageSquare },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
  { label: "Billing & Plan", href: "/dashboard/billing", icon: CreditCard },
];

const ACTIONS = [
  { label: "New booking", href: "/dashboard/bookings", icon: Plus },
  { label: "Add resource", href: "/dashboard/resources/new", icon: Plus },
  { label: "Invite member", href: "/dashboard/members", icon: Plus },
  { label: "Log a visitor", href: "/dashboard/visitors", icon: Plus },
];

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();

  // Global keyboard shortcut: Ctrl/Cmd + K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} className="sm:max-w-lg">
      <Command>
        <CommandInput placeholder="Search pages and actions…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Go to">
            {NAV.map((n) => (
              <CommandItem key={n.href} value={n.label} onSelect={() => go(n.href)}>
                <n.icon className="text-gray-400" /> {n.label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Quick actions">
            {ACTIONS.map((a) => (
              <CommandItem key={a.label} value={a.label} onSelect={() => go(a.href)}>
                <a.icon className="text-emerald-500" /> {a.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
