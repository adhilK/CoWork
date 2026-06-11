"use client";

import { Check, Sparkles, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Plan } from "@prisma/client";
import {
  PLATFORM_PLAN_PRICES,
  PLATFORM_ADDON_PRICES,
  formatPlatformPrice,
  type Jurisdiction,
} from "@/lib/jurisdiction";

type Props = {
  currentPlan: Plan;
  trialDaysLeft: number | null;
  hasSubscription: boolean;
  jurisdiction: Jurisdiction;
};

type TierDef = {
  id: Plan;
  name: string;
  tagline: string;
  features: string[];
};

const TIERS: TierDef[] = [
  {
    id: "STARTER",
    name: "Starter",
    tagline: "1 location · up to 50 members",
    features: [
      "Bookings & resources",
      "Manual invoicing",
      "Tap payments (AED/SAR)",
      "Member portal",
      "Email support",
    ],
  },
  {
    id: "GROWTH",
    name: "Growth",
    tagline: "1–2 locations · up to 150 members",
    features: [
      "Everything in Starter",
      "Virtual office module",
      "Automated billing",
      "Visitor management",
      "Basic analytics",
      "Priority support",
    ],
  },
  {
    id: "PRO",
    name: "Business",
    tagline: "Up to 5 locations · 300 members",
    features: [
      "Everything in Growth",
      "Business Setup CRM",
      "PRO Services tracker",
      "Multi-location P&L",
      "Advanced analytics",
      "Phone support",
    ],
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    tagline: "Unlimited · franchise / white-label",
    features: [
      "Everything in Business",
      "ZATCA e-invoicing (KSA)",
      "White-label portal",
      "Franchise mode",
      "Dedicated manager",
      "SLA & custom integrations",
    ],
  },
];

type AddonDef = {
  key: string;
  label: string;
  description: string;
  ksaOnly?: boolean;
};

const ADDONS: AddonDef[] = [
  { key: "WHATSAPP",       label: "WhatsApp Business API",   description: "Transactional sends, two-way support & broadcast" },
  { key: "BUSINESS_SETUP", label: "Business Setup CRM",      description: "Lead pipeline, license catalog, proposals, renewals" },
  { key: "PRO_SERVICES",   label: "PRO Services Tracker",    description: "Government-liaison workflow & SLA tracking" },
  { key: "ZATCA",          label: "ZATCA E-Invoicing",       description: "Mandatory KSA e-invoicing via certified middleware", ksaOnly: true },
  { key: "WHITE_LABEL",    label: "White-label Portal",      description: "Custom domain, logo & colours on member portal" },
  { key: "EXTRA_LOCATION", label: "Extra Location",          description: "Per additional location beyond your plan limit" },
];

const ORDER: Record<Plan, number> = { STARTER: 0, GROWTH: 1, PRO: 2, ENTERPRISE: 3 };

export function BillingView({ currentPlan, trialDaysLeft, hasSubscription, jurisdiction }: Props) {
  const currency = jurisdiction === "KSA" ? "SAR" : "AED";

  function handleSelect(tier: Plan) {
    if (tier === currentPlan) return;
    toast.info("Online checkout is coming soon — email billing@coworkpro.io and we'll switch your plan.");
  }

  function handleAddon() {
    toast.info("To add a module, email billing@coworkpro.io with your org name.");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing &amp; Plan</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your CoWork Pro subscription.</p>
      </div>

      {/* Current status banner */}
      <div
        className="dashboard-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{ background: "linear-gradient(135deg, #0F172A, #15803D)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.15)" }}
          >
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold">
              You&apos;re on the{" "}
              <span className="capitalize">{currentPlan.toLowerCase()}</span> plan
            </p>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
              {hasSubscription
                ? `Active subscription · billed in ${currency}`
                : trialDaysLeft !== null
                ? `Free trial — ${trialDaysLeft} day${trialDaysLeft !== 1 ? "s" : ""} left.`
                : "No active subscription."}
            </p>
          </div>
        </div>
        {!hasSubscription && trialDaysLeft !== null && trialDaysLeft <= 14 && (
          <span
            className="text-xs font-semibold px-3 py-1.5 rounded-full self-start sm:self-auto"
            style={{ background: "rgba(255,255,255,0.15)", color: "white" }}
          >
            ⏱ {trialDaysLeft} days left in trial
          </span>
        )}
      </div>

      {/* Plan tiers */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {TIERS.map((t) => {
            const isCurrent = t.id === currentPlan;
            const isUpgrade = ORDER[t.id] > ORDER[currentPlan];
            const pricing = PLATFORM_PLAN_PRICES[t.id];
            const displayPrice = pricing ? formatPlatformPrice(pricing, jurisdiction) : "Custom";
            const isCustom = displayPrice === "Custom";

            return (
              <div
                key={t.id}
                className={cn(
                  "dashboard-card p-5 flex flex-col relative overflow-hidden",
                  isCurrent && "ring-2 ring-emerald-400"
                )}
              >
                {isCurrent && (
                  <span
                    className="absolute top-0 right-0 text-[10px] font-bold text-white px-2.5 py-1 rounded-bl-lg"
                    style={{ background: "#22C55E" }}
                  >
                    YOUR PLAN
                  </span>
                )}
                <p className="font-bold text-gray-900">{t.name}</p>
                <p className="text-xs text-gray-400 mb-3">{t.tagline}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isCustom ? (
                    "Custom"
                  ) : (
                    <>
                      {displayPrice}
                      <span className="text-sm font-normal text-gray-400">/mo</span>
                    </>
                  )}
                </p>
                <ul className="space-y-1.5 mt-4 flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-xs text-gray-600">
                      <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handleSelect(t.id)}
                  disabled={isCurrent}
                  className={cn(
                    "mt-5 w-full font-semibold",
                    isCurrent ? "bg-gray-100 text-gray-400" : "text-white"
                  )}
                  style={
                    isCurrent
                      ? {}
                      : {
                          background: isUpgrade
                            ? "linear-gradient(135deg, #15803D, #22C55E)"
                            : "#0F172A",
                        }
                  }
                >
                  {isCurrent ? "Current plan" : isCustom ? "Contact us" : isUpgrade ? "Upgrade" : "Switch"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add-on modules */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-1">Add-on modules</h2>
        <p className="text-xs text-gray-400 mb-3">
          Billed monthly on top of your base plan. Contact us to activate.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ADDONS.filter((a) => !a.ksaOnly || jurisdiction === "KSA").map((addon) => {
            const pricing = PLATFORM_ADDON_PRICES[addon.key];
            const displayPrice = pricing ? formatPlatformPrice(pricing, jurisdiction) : null;

            return (
              <div
                key={addon.key}
                className="dashboard-card p-4 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-gray-900">{addon.label}</p>
                    {addon.ksaOnly && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                        KSA only
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{addon.description}</p>
                </div>
                <div className="flex flex-col items-end flex-shrink-0 gap-2">
                  <p className="text-sm font-bold text-gray-900 whitespace-nowrap">
                    {displayPrice ?? "—"}
                    {displayPrice && displayPrice !== "Custom" && (
                      <span className="text-xs font-normal text-gray-400">/mo</span>
                    )}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddon}
                    className="h-7 px-2.5 text-xs border-gray-200 text-gray-600 hover:text-gray-900"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Prices in {currency}, billed monthly. Questions? Email{" "}
        <a href="mailto:billing@coworkpro.io" className="underline">
          billing@coworkpro.io
        </a>
      </p>
    </div>
  );
}
