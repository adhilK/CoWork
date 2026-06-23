"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Rocket, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ROLE_LABELS, type AppRole } from "@/lib/permissions";

type Guide = { intro: string; points: { label: string; href: string }[] };

function getRoleGuide(role: string, businessType: string | null): Guide {
  const isBizCenter = businessType === "Business Center";

  const guides: Record<string, Guide> = {
    OWNER: isBizCenter
      ? {
          intro: "You have full access to everything. The checklist on your dashboard walks you through getting set up.",
          points: [
            { label: "Set up virtual office addresses", href: "/dashboard/virtual-office/addresses" },
            { label: "Add your first client", href: "/dashboard/members" },
            { label: "Invite your team", href: "/dashboard/settings/team" },
          ],
        }
      : {
          intro: "You have full access to everything. The checklist on your dashboard walks you through getting set up.",
          points: [
            { label: "Add desks & rooms", href: "/dashboard/resources" },
            { label: "Invite your members", href: "/dashboard/members" },
            { label: "Invite your team", href: "/dashboard/settings/team" },
          ],
        },
    ADMIN: isBizCenter
      ? {
          intro: "You can run every part of operations — just not platform billing.",
          points: [
            { label: "Business Setup pipeline", href: "/dashboard/business-setup/leads" },
            { label: "Manage clients", href: "/dashboard/members" },
            { label: "Invoices & billing", href: "/dashboard/invoices" },
          ],
        }
      : {
          intro: "You can run every part of operations — just not platform billing.",
          points: [
            { label: "Manage resources", href: "/dashboard/resources" },
            { label: "Manage members", href: "/dashboard/members" },
            { label: "Invoices & billing", href: "/dashboard/invoices" },
          ],
        },
    MANAGER: {
      intro: isBizCenter
        ? "You handle day-to-day operations for business services and clients."
        : "You handle day-to-day operations across the space.",
      points: isBizCenter
        ? [
            { label: "Business Setup pipeline", href: "/dashboard/business-setup/leads" },
            { label: "Clients", href: "/dashboard/members" },
            { label: "Invoices", href: "/dashboard/invoices" },
          ]
        : [
            { label: "Bookings calendar", href: "/dashboard/bookings" },
            { label: "Members", href: "/dashboard/members" },
            { label: "Invoices", href: "/dashboard/invoices" },
          ],
    },
    RECEPTIONIST: {
      intro: "You run the front desk — checking in visitors and keeping an eye on today's bookings.",
      points: [
        { label: "Check in a visitor", href: "/dashboard/visitors" },
        { label: "See today's bookings", href: "/dashboard/bookings" },
      ],
    },
    PRO_AGENT: {
      intro: "You handle company formation and government services for clients.",
      points: [
        { label: "Business Setup pipeline", href: "/dashboard/business-setup/leads" },
        { label: "PRO Services queue", href: "/dashboard/pro-services" },
      ],
    },
  };

  return guides[role] ?? guides.ADMIN!;
}

/**
 * One-time, role-specific welcome shown the first time a user reaches the
 * dashboard. Dismissal is remembered per user in localStorage, so it never
 * nags on later visits.
 */
export function RoleWelcome({ role, userId, userName, businessType }: { role: AppRole; userId: string; userName: string | null; businessType: string | null }) {
  const [open, setOpen] = useState(false);
  const key = `cw_welcome_seen_${userId}`;

  useEffect(() => {
    try {
      if (!localStorage.getItem(key)) setOpen(true);
    } catch { /* ignore */ }
  }, [key]);

  function dismiss() {
    try { localStorage.setItem(key, "1"); } catch { /* ignore */ }
    setOpen(false);
  }

  const guide = getRoleGuide(role, businessType);
  const firstName = userName?.split(" ")[0] ?? "there";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) dismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <div className="text-center pt-2">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
            <Rocket className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Welcome, {firstName}!</h2>
          <div className="inline-flex items-center gap-1.5 mt-1.5">
            <span className="text-xs text-gray-400">You're signed in as</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">{ROLE_LABELS[role] ?? role}</span>
          </div>
          <p className="text-sm text-gray-500 mt-3 leading-relaxed">{guide.intro}</p>
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Jump in</p>
          {guide.points.map((p) => (
            <Link key={p.href} href={p.href} onClick={dismiss}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/40 transition-colors">
              <span className="flex-1 text-sm font-medium text-gray-800">{p.label}</span>
              <ArrowRight className="w-4 h-4 text-gray-300" />
            </Link>
          ))}
        </div>

        <Button onClick={dismiss} className="w-full mt-4 text-white" style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
          Got it — let's go
        </Button>
      </DialogContent>
    </Dialog>
  );
}
