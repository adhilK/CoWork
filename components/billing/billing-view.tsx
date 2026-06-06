"use client";

import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Plan } from "@prisma/client";

type Props = {
  currentPlan: Plan;
  trialDaysLeft: number | null;
  hasSubscription: boolean;
};

const TIERS: { id: Plan; name: string; price: string; tagline: string; features: string[] }[] = [
  {
    id: "STARTER", name: "Starter", price: "£49", tagline: "For new & solo spaces",
    features: ["Up to 50 members", "Bookings & resources", "Manual invoicing", "Member portal", "Email support"],
  },
  {
    id: "GROWTH", name: "Growth", price: "£99", tagline: "For growing spaces",
    features: ["Up to 150 members", "Everything in Starter", "Automated billing", "Visitor management", "Analytics", "Priority support"],
  },
  {
    id: "PRO", name: "Pro", price: "£179", tagline: "For established operators",
    features: ["Unlimited members", "Everything in Growth", "Multi-location", "Community & events", "Advanced analytics", "Phone support"],
  },
  {
    id: "ENTERPRISE", name: "Enterprise", price: "Custom", tagline: "For multi-site networks",
    features: ["Everything in Pro", "White-label portal", "Dedicated manager", "Custom integrations", "SLA & onboarding"],
  },
];

const ORDER: Record<Plan, number> = { STARTER: 0, GROWTH: 1, PRO: 2, ENTERPRISE: 3 };

export function BillingView({ currentPlan, trialDaysLeft, hasSubscription }: Props) {
  function handleSelect(tier: Plan) {
    if (tier === currentPlan) return;
    toast.info("Online checkout is coming soon — email billing@coworkpro.io and we'll switch your plan over.");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing &amp; Plan</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your CoWork Pro subscription.</p>
      </div>

      {/* Current status */}
      <div className="dashboard-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{ background: "linear-gradient(135deg, #0F172A, #15803D)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.15)" }}>
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold">
              You're on the <span className="capitalize">{currentPlan.toLowerCase()}</span> plan
            </p>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
              {hasSubscription
                ? "Active subscription — billed monthly."
                : trialDaysLeft !== null
                  ? `Free trial — ${trialDaysLeft} day${trialDaysLeft !== 1 ? "s" : ""} left.`
                  : "No active subscription."}
            </p>
          </div>
        </div>
        {!hasSubscription && trialDaysLeft !== null && trialDaysLeft <= 14 && (
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full self-start sm:self-auto"
            style={{ background: "rgba(255,255,255,0.15)", color: "white" }}>
            ⏱ {trialDaysLeft} days left in trial
          </span>
        )}
      </div>

      {/* Plan tiers */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {TIERS.map((t) => {
          const isCurrent = t.id === currentPlan;
          const isUpgrade = ORDER[t.id] > ORDER[currentPlan];
          return (
            <div key={t.id} className={cn(
              "dashboard-card p-5 flex flex-col relative overflow-hidden",
              isCurrent && "ring-2 ring-emerald-400"
            )}>
              {isCurrent && (
                <span className="absolute top-0 right-0 text-[10px] font-bold text-white px-2.5 py-1 rounded-bl-lg"
                  style={{ background: "#22C55E" }}>YOUR PLAN</span>
              )}
              <p className="font-bold text-gray-900">{t.name}</p>
              <p className="text-xs text-gray-400 mb-3">{t.tagline}</p>
              <p className="text-2xl font-bold text-gray-900">
                {t.price}<span className="text-sm font-normal text-gray-400">{t.price !== "Custom" ? "/mo" : ""}</span>
              </p>
              <ul className="space-y-1.5 mt-4 flex-1">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-xs text-gray-600">
                    <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => handleSelect(t.id)}
                disabled={isCurrent}
                className={cn("mt-5 w-full font-semibold", isCurrent ? "bg-gray-100 text-gray-400" : "text-white")}
                style={isCurrent ? {} : { background: isUpgrade ? "linear-gradient(135deg, #15803D, #22C55E)" : "#0F172A" }}>
                {isCurrent ? "Current plan" : isUpgrade ? "Upgrade" : "Switch"}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 text-center">
        Prices in GBP, billed monthly. Questions? Email billing@coworkpro.io
      </p>
    </div>
  );
}
