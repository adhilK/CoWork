"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";
import {
  LayoutDashboard, Calendar, Building2, Users, Tag, UserCheck, FileText,
  BarChart3, MessageSquare, Settings, CreditCard, Plus, Landmark, Stamp,
  Mailbox, FolderLock, Handshake, MessageCircle, MapPin, Zap,
} from "lucide-react";
import { can, type Capability, type AppRole } from "@/lib/permissions";

type Entry = { label: string; href: string; icon: any; cap: Capability };

// Mirrors the sidebar's grouped navigation so search covers every section,
// not just the original core pages.
const NAV: Entry[] = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard, cap: "dashboard" },
  { label: "Bookings", href: "/dashboard/bookings", icon: Calendar, cap: "bookings" },
  { label: "Resources", href: "/dashboard/resources", icon: Building2, cap: "resources" },
  { label: "Visitors", href: "/dashboard/visitors", icon: UserCheck, cap: "visitors" },
  { label: "Members", href: "/dashboard/members", icon: Users, cap: "members" },
  { label: "Plans", href: "/dashboard/plans", icon: Tag, cap: "plans" },
  { label: "Invoices & Billing", href: "/dashboard/invoices", icon: FileText, cap: "invoices" },
  { label: "Business Setup", href: "/dashboard/business-setup/leads", icon: Landmark, cap: "businessSetup" },
  { label: "License Catalog", href: "/dashboard/business-setup/licenses", icon: Landmark, cap: "businessSetup" },
  { label: "PRO Services", href: "/dashboard/pro-services", icon: Stamp, cap: "proServices" },
  { label: "Virtual Office", href: "/dashboard/virtual-office", icon: Mailbox, cap: "virtualOffice" },
  { label: "Documents", href: "/dashboard/documents", icon: FolderLock, cap: "documents" },
  { label: "Partners", href: "/dashboard/partners", icon: Handshake, cap: "partners" },
  { label: "WhatsApp", href: "/dashboard/whatsapp", icon: MessageCircle, cap: "whatsapp" },
  { label: "Community", href: "/dashboard/community", icon: MessageSquare, cap: "community" },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3, cap: "analytics" },
  { label: "Locations", href: "/dashboard/locations", icon: MapPin, cap: "locations" },
  { label: "Automations", href: "/dashboard/automations", icon: Zap, cap: "automations" },
  { label: "Settings", href: "/dashboard/settings", icon: Settings, cap: "settings" },
  { label: "Billing & Plan", href: "/dashboard/billing", icon: CreditCard, cap: "billing" },
];

const ACTIONS: Entry[] = [
  { label: "New booking", href: "/dashboard/bookings", icon: Plus, cap: "bookings" },
  { label: "Add resource", href: "/dashboard/resources/new", icon: Plus, cap: "resources" },
  { label: "Invite member", href: "/dashboard/members", icon: Plus, cap: "members" },
  { label: "Log a visitor", href: "/dashboard/visitors", icon: Plus, cap: "visitors" },
  { label: "New PRO request", href: "/dashboard/pro-services", icon: Plus, cap: "proServices" },
  { label: "New business-setup lead", href: "/dashboard/business-setup/leads", icon: Plus, cap: "businessSetup" },
];

export function CommandPalette({
  open, onOpenChange, role,
}: { open: boolean; onOpenChange: (o: boolean) => void; role: AppRole }) {
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

  // Only show pages/actions this role is allowed to reach.
  const nav = NAV.filter((n) => can(role, n.cap));
  const actions = ACTIONS.filter((a) => can(role, a.cap));

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} className="sm:max-w-lg">
      <Command>
        <CommandInput placeholder="Search pages and actions…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Go to">
            {nav.map((n) => (
              <CommandItem key={n.href} value={n.label} onSelect={() => go(n.href)}>
                <n.icon className="text-gray-400" /> {n.label}
              </CommandItem>
            ))}
          </CommandGroup>
          {actions.length > 0 && (
            <CommandGroup heading="Quick actions">
              {actions.map((a) => (
                <CommandItem key={a.label} value={a.label} onSelect={() => go(a.href)}>
                  <a.icon className="text-emerald-500" /> {a.label}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
