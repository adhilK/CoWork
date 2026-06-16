"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import {
  PLATFORM_PLAN_PRICES,
  formatPlatformPrice,
  type Jurisdiction,
} from "@/lib/jurisdiction";

type Plan = {
  key: keyof typeof PLATFORM_PLAN_PRICES;
  name: string;
  pitch: string;
  limits: string;
  features: string[];
  highlight?: boolean;
};

const PLANS: Plan[] = [
  {
    key: "STARTER",
    name: "Starter",
    pitch: "Get one space running, billed correctly, today.",
    limits: "1 location · up to 50 members",
    features: [
      "Bookings, resources, and QR check-in",
      "Members and membership plans",
      "VAT invoicing with PDF receipts",
      "Member self-service portal",
    ],
  },
  {
    key: "GROWTH",
    name: "Growth",
    pitch: "Add recurring revenue beyond the desk.",
    limits: "Up to 2 locations · 150 members",
    features: [
      "Everything in Starter",
      "Virtual office and mail handling",
      "Multi-location management",
      "WhatsApp messaging (add-on)",
    ],
  },
  {
    key: "PRO",
    name: "Business",
    pitch: "Run formation and PRO services as real revenue lines.",
    limits: "Up to 5 locations · 300 members",
    features: [
      "Everything in Growth",
      "Business setup CRM and proposals",
      "PRO services and renewal tracking",
      "Partner and referral network",
    ],
    highlight: true,
  },
  {
    key: "ENTERPRISE",
    name: "Enterprise",
    pitch: "Franchise scale, full compliance, your brand.",
    limits: "Unlimited locations · franchise mode",
    features: [
      "Everything in Business",
      "ZATCA e-invoicing for Saudi",
      "White-label member portal",
      "API access and priority support",
    ],
  },
];

export function PricingSection() {
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>("UAE");

  return (
    <section id="pricing" className="border-t border-zinc-100 bg-zinc-50/60 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="flex items-center justify-center gap-2.5">
            <span className="h-px w-7 bg-emerald-500/50" />
            <span className="font-heading text-xs font-medium uppercase tracking-[0.15em] text-emerald-600">Pricing</span>
          </div>
          <h2 className="mt-4 font-heading text-3xl font-bold tracking-[-0.02em] text-zinc-900 sm:text-4xl">
            One subscription. Every revenue line.
          </h2>
          <p className="mt-4 text-lg text-zinc-600">
            Priced in your currency, with VAT and e-invoicing handled. Start free for 14 days, no card needed.
          </p>
        </div>

        {/* Currency / market toggle */}
        <div className="mt-8 flex justify-center">
          <div className="inline-flex rounded-full border border-zinc-200 bg-white p-1">
            {([
              ["UAE", "UAE · AED"],
              ["KSA", "Saudi · SAR"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setJurisdiction(value)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  jurisdiction === value ? "bg-zinc-900 text-white" : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Plans */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((plan) => {
            const price = formatPlatformPrice(PLATFORM_PLAN_PRICES[plan.key]!, jurisdiction);
            const isCustom = price === "Custom";
            return (
              <div
                key={plan.key}
                className={`relative flex flex-col rounded-2xl border bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-zinc-900/5 ${
                  plan.highlight ? "border-emerald-500 shadow-lg shadow-emerald-500/10" : "border-zinc-200"
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-6 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                    Most popular
                  </span>
                )}
                <h3 className="text-lg font-semibold text-zinc-900">{plan.name}</h3>
                <p className="mt-1 text-sm text-zinc-500">{plan.pitch}</p>

                <div className="mt-5 flex items-baseline gap-1.5">
                  {isCustom ? (
                    <span className="text-3xl font-bold tracking-tight text-zinc-900">Custom</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold tracking-tight text-zinc-900">{price}</span>
                      <span className="text-sm font-medium text-zinc-500">/ month</span>
                    </>
                  )}
                </div>
                <p className="mt-2 text-xs font-medium text-zinc-500">{plan.limits}</p>

                <Link
                  href={isCustom ? "/register?plan=enterprise" : `/register?plan=${plan.key.toLowerCase()}`}
                  className={`mt-6 rounded-full px-4 py-2.5 text-center text-sm font-semibold transition-transform active:scale-[0.98] ${
                    plan.highlight
                      ? "text-white"
                      : "border border-zinc-200 text-zinc-900 hover:bg-zinc-50"
                  }`}
                  style={plan.highlight ? { background: "linear-gradient(135deg, #16A34A, #15803D)" } : undefined}
                >
                  {isCustom ? "Talk to sales" : "Start free trial"}
                </Link>

                <ul className="mt-6 space-y-3 border-t border-zinc-100 pt-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-600">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-sm text-zinc-500">
          Add-ons when you need them: WhatsApp Business API, Business Setup CRM, PRO Services,
          {jurisdiction === "KSA" ? " ZATCA e-invoicing," : ""} white-label, and extra locations.
        </p>
      </div>
    </section>
  );
}
