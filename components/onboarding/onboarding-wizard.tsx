"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2, Check, ArrowRight, ArrowLeft, Building2, MapPin, LayoutGrid,
  CreditCard, BadgeCheck, Sparkles, Plus, Trash2, ExternalLink, Armchair,
  Briefcase, DoorClosed, Users2, PartyPopper, Mail, Headphones,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MaktabyLogo } from "@/components/ui/maktaby-logo";
import { cn } from "@/lib/utils";

// ── Static config ───────────────────────────────────────────────────────────

type Jurisdiction = "UAE" | "KSA";

const BUSINESS_TYPES = ["Coworking Space", "Business Center", "Serviced Offices", "Mixed Use"];

const CITIES: Record<Jurisdiction, string[]> = {
  UAE: ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Other"],
  KSA: ["Riyadh", "Jeddah", "Dammam", "Khobar", "Mecca", "Medina", "Other"],
};

const DAYS: { key: string; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

type DayHours = { open: string; close: string; closed: boolean };

function defaultHours(): Record<string, DayHours> {
  const h: Record<string, DayHours> = {};
  for (const d of DAYS) {
    if (d.key === "sun") h[d.key] = { open: "09:00", close: "18:00", closed: true };
    else if (d.key === "sat") h[d.key] = { open: "09:00", close: "18:00", closed: false };
    else h[d.key] = { open: "08:00", close: "20:00", closed: false };
  }
  return h;
}

type ResourceTypeKey =
  | "HOT_DESK" | "DEDICATED_DESK" | "PRIVATE_OFFICE" | "MEETING_ROOM"
  | "EVENT_SPACE" | "VIRTUAL_OFFICE" | "PHONE_BOOTH";

type PriceField = "hourly" | "halfDay" | "fullDay" | "monthly";

const PRICE_FIELD_LABELS: Record<PriceField, string> = {
  hourly: "Hourly",
  halfDay: "Half day",
  fullDay: "Full day",
  monthly: "Monthly",
};

const RESOURCE_OPTIONS: {
  key: ResourceTypeKey; label: string; icon: any;
  prices: { field: PriceField; placeholder: string }[];
}[] = [
  { key: "HOT_DESK", label: "Hot desks", icon: Armchair,
    prices: [{ field: "hourly", placeholder: "40" }, { field: "halfDay", placeholder: "120" }, { field: "fullDay", placeholder: "200" }, { field: "monthly", placeholder: "500" }] },
  { key: "DEDICATED_DESK", label: "Dedicated desks", icon: Briefcase,
    prices: [{ field: "hourly", placeholder: "60" }, { field: "halfDay", placeholder: "180" }, { field: "fullDay", placeholder: "300" }, { field: "monthly", placeholder: "900" }] },
  { key: "PRIVATE_OFFICE", label: "Private offices", icon: DoorClosed,
    prices: [{ field: "hourly", placeholder: "100" }, { field: "halfDay", placeholder: "300" }, { field: "fullDay", placeholder: "500" }, { field: "monthly", placeholder: "2500" }] },
  { key: "MEETING_ROOM", label: "Meeting rooms", icon: Users2,
    prices: [{ field: "hourly", placeholder: "80" }, { field: "halfDay", placeholder: "250" }, { field: "fullDay", placeholder: "400" }] },
  { key: "EVENT_SPACE", label: "Event space", icon: PartyPopper,
    prices: [{ field: "hourly", placeholder: "200" }, { field: "halfDay", placeholder: "600" }, { field: "fullDay", placeholder: "1200" }] },
  { key: "VIRTUAL_OFFICE", label: "Virtual office addresses", icon: Mail,
    prices: [{ field: "monthly", placeholder: "300" }] },
  { key: "PHONE_BOOTH", label: "Phone booths / focus pods", icon: Headphones,
    prices: [] },
];

type ResourceEntry = { enabled: boolean; quantity: string; hourly: string; halfDay: string; fullDay: string; monthly: string };

type PlanType = "DAY_PASS" | "HOT_DESK" | "DEDICATED_DESK" | "PRIVATE_OFFICE" | "VIRTUAL_OFFICE" | "CUSTOM";
type PlanRow = { name: string; type: PlanType; price: string; billingCycle: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY"; includedCredits: string };

const PLAN_PRESETS: { label: string; row: PlanRow }[] = [
  { label: "Hot Desk Monthly", row: { name: "Hot Desk Monthly", type: "HOT_DESK", price: "500", billingCycle: "MONTHLY", includedCredits: "0" } },
  { label: "Dedicated Desk", row: { name: "Dedicated Desk", type: "DEDICATED_DESK", price: "900", billingCycle: "MONTHLY", includedCredits: "5" } },
  { label: "Private Office", row: { name: "Private Office", type: "PRIVATE_OFFICE", price: "2500", billingCycle: "MONTHLY", includedCredits: "20" } },
];

const STEPS = [
  { n: 1, label: "Your space", icon: Building2 },
  { n: 2, label: "Location", icon: MapPin },
  { n: 3, label: "Offerings", icon: LayoutGrid },
  { n: 4, label: "Plans", icon: BadgeCheck },
  { n: 5, label: "Payments", icon: CreditCard },
  { n: 6, label: "Done", icon: Sparkles },
];

const STORAGE_KEY = "coworkpro_onboarding_v1";
const GREEN = "linear-gradient(135deg, #15803D, #22C55E)";

// ── State shape ───────────────────────────────────────────────────────────────

type WizardState = {
  step: number;
  // Step 1
  spaceName: string; businessType: string; jurisdiction: Jurisdiction;
  city: string; phone: string; whatsappNumber: string; sameWhatsApp: boolean;
  // Step 2
  locationName: string; address: string; openingHours: Record<string, DayHours>;
  // Step 3
  resources: Record<ResourceTypeKey, ResourceEntry>;
  // Step 4
  offerPlans: "yes" | "no" | "later"; plans: PlanRow[];
  // Step 5
  tapSecretKey: string; moyasarApiKey: string;
  acceptBank: boolean; bankName: string; iban: string; accountName: string;
  skipPayments: boolean;
};

function freshResources(): Record<ResourceTypeKey, ResourceEntry> {
  const r = {} as Record<ResourceTypeKey, ResourceEntry>;
  for (const o of RESOURCE_OPTIONS) r[o.key] = { enabled: false, quantity: "1", hourly: "", halfDay: "", fullDay: "", monthly: "" };
  return r;
}

type InitialProps = {
  spaceName: string; jurisdiction: Jurisdiction; businessType: string;
  phone: string; whatsappNumber: string;
};

function initialState(initial: InitialProps): WizardState {
  return {
    step: 1,
    spaceName: initial.spaceName ?? "",
    businessType: initial.businessType || BUSINESS_TYPES[0]!,
    jurisdiction: initial.jurisdiction ?? "UAE",
    city: "",
    phone: initial.phone ?? "",
    whatsappNumber: initial.whatsappNumber ?? "",
    sameWhatsApp: !initial.whatsappNumber,
    locationName: "Main Branch",
    address: "",
    openingHours: defaultHours(),
    resources: freshResources(),
    offerPlans: "later",
    plans: [],
    tapSecretKey: "",
    moyasarApiKey: "",
    acceptBank: false,
    bankName: "",
    iban: "",
    accountName: "",
    skipPayments: false,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function OnboardingWizard({ initial }: { initial: InitialProps }) {
  const router = useRouter();
  const [state, setState] = useState<WizardState>(() => initialState(initial));
  const [hydrated, setHydrated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<{
    locationName: string; resourcesCreated: number; virtualOfficeCreated: number;
    plansCreated: number; paymentsConfigured: boolean; jurisdiction: string; currency: string;
  } | null>(null);

  // Restore persisted progress (refresh-safe).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<WizardState>;
        setState((s) => ({ ...s, ...saved, openingHours: { ...s.openingHours, ...(saved.openingHours ?? {}) }, resources: { ...s.resources, ...(saved.resources ?? {}) } }));
      }
    } catch { /* ignore corrupt storage */ }
    setHydrated(true);
  }, []);

  // Persist on every change (only once hydrated, never persist the final step).
  useEffect(() => {
    if (!hydrated) return;
    if (state.step >= 6) return;
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* quota */ }
  }, [state, hydrated]);

  const set = <K extends keyof WizardState>(key: K, value: WizardState[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const currency = state.jurisdiction === "KSA" ? "SAR" : "AED";
  const vat = state.jurisdiction === "KSA" ? "15%" : "5%";
  const cities = CITIES[state.jurisdiction];

  // ── Per-step validation ──────────────────────────────────────────────────
  function validateStep(step: number): string | null {
    if (step === 1) {
      if (state.spaceName.trim().length < 2) return "Enter your space name (at least 2 characters).";
      if (!state.city) return "Select your city.";
    }
    if (step === 2) {
      if (!state.locationName.trim()) return "Give your location a name.";
      const anyOpen = DAYS.some((d) => !state.openingHours[d.key]?.closed);
      if (!anyOpen) return "Your space needs at least one open day.";
    }
    if (step === 3) {
      for (const o of RESOURCE_OPTIONS) {
        const r = state.resources[o.key];
        if (r.enabled && (!r.quantity || Number(r.quantity) < 1)) return `Enter a quantity for ${o.label}.`;
      }
    }
    if (step === 4) {
      if (state.offerPlans === "yes") {
        for (const p of state.plans) {
          if (!p.name.trim()) return "Each plan needs a name.";
          if (p.price === "" || Number(p.price) < 0) return `Enter a price for "${p.name || "your plan"}".`;
        }
      }
    }
    if (step === 5) {
      if (state.acceptBank) {
        if (!state.bankName.trim() || !state.iban.trim() || !state.accountName.trim())
          return "Complete the bank transfer details, or turn that option off.";
      }
    }
    return null;
  }

  function next() {
    const err = validateStep(state.step);
    if (err) { toast.error(err); return; }
    if (state.step === 5) { void submit(); return; }
    set("step", Math.min(6, state.step + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    set("step", Math.max(1, state.step - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Submission ─────────────────────────────────────────────────────────────
  // `forceSkipPayments` lets the "Skip for now" button submit immediately without
  // waiting for the skipPayments state update to flush (stale-closure safe).
  async function submit(forceSkipPayments = false) {
    const skipPayments = forceSkipPayments || state.skipPayments;
    setSubmitting(true);
    try {
      const resources = RESOURCE_OPTIONS.flatMap((o) => {
        const r = state.resources[o.key];
        if (!r.enabled) return [];
        const enabledFields = Object.fromEntries(
          o.prices.map((p) => [p.field, r[p.field] !== "" ? Number(r[p.field]) : null])
        );
        return [{
          type: o.key,
          quantity: Math.max(1, Number(r.quantity) || 1),
          hourly: enabledFields.hourly ?? null,
          halfDay: enabledFields.halfDay ?? null,
          fullDay: enabledFields.fullDay ?? null,
          monthly: enabledFields.monthly ?? null,
        }];
      });

      const plans = state.offerPlans === "yes"
        ? state.plans.map((p) => ({
            name: p.name.trim(),
            type: p.type,
            price: Number(p.price) || 0,
            billingCycle: p.billingCycle,
            includedCredits: Number(p.includedCredits) || 0,
          }))
        : [];

      const payments = skipPayments
        ? null
        : {
            tapSecretKey: state.tapSecretKey.trim() || null,
            moyasarApiKey: state.moyasarApiKey.trim() || null,
            bankTransfer: state.acceptBank
              ? { bankName: state.bankName.trim(), iban: state.iban.trim(), accountName: state.accountName.trim() }
              : null,
          };

      const whatsappNumber = state.sameWhatsApp ? state.phone.trim() : state.whatsappNumber.trim();

      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          space: {
            name: state.spaceName.trim(),
            businessType: state.businessType,
            jurisdiction: state.jurisdiction,
            city: state.city,
            phone: state.phone.trim() || null,
            whatsappNumber: whatsappNumber || null,
          },
          location: {
            name: state.locationName.trim(),
            address: state.address.trim() || null,
            openingHours: state.openingHours,
          },
          resources,
          plans,
          payments,
        }),
      });

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? "Failed to complete setup");
      }
      const json = await res.json();
      setSummary(json.summary ?? null);
      try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
      set("step", 6);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  // Avoid a hydration flash of default state before sessionStorage loads.
  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(160deg, #0D1712, #14241a)" }}>
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  const enabledResourceCount = RESOURCE_OPTIONS.filter((o) => state.resources[o.key].enabled).length;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(160deg, #0D1712, #14241a)" }}>
      {/* Header / progress */}
      <header className="px-4 sm:px-6 pt-6 pb-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-center mb-6">
            <MaktabyLogo variant="dark" size="sm" />
          </div>
          <StepIndicator current={state.step} />
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 px-4 sm:px-6 pb-28">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-8">
            {state.step === 1 && (
              <Step1 state={state} set={set} currency={currency} vat={vat} cities={cities} />
            )}
            {state.step === 2 && <Step2 state={state} set={set} />}
            {state.step === 3 && (
              <Step3 state={state} setState={setState} currency={currency} />
            )}
            {state.step === 4 && (
              <Step4 state={state} setState={setState} currency={currency} />
            )}
            {state.step === 5 && <Step5 state={state} set={set} currency={currency} />}
            {state.step === 6 && (
              <Step6
                summary={summary}
                currency={currency}
                onDashboard={() => { router.push("/dashboard"); router.refresh(); }}
                onInvite={() => { router.push("/dashboard/members"); router.refresh(); }}
              />
            )}
          </div>

          {state.step === 3 && enabledResourceCount === 0 && (
            <p className="text-center text-xs text-white/50 mt-3">
              Nothing selected — that&apos;s fine. You can add desks and rooms anytime from the dashboard.
            </p>
          )}
        </div>
      </main>

      {/* Sticky footer nav (hidden on the success step) */}
      {state.step < 6 && (
        <footer className="fixed bottom-0 inset-x-0 border-t border-white/10 bg-[#0D1712]/80 backdrop-blur px-4 sm:px-6 py-3">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <Button
              type="button" variant="outline"
              className="h-11 px-5 bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white disabled:opacity-30"
              onClick={back} disabled={state.step === 1 || submitting}
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
            </Button>

            <div className="flex items-center gap-3">
              {(state.step === 3 || state.step === 4 || state.step === 5) && (
                <button
                  type="button"
                  onClick={() => {
                    if (state.step === 3) { setState((s) => ({ ...s, resources: freshResources(), step: 4 })); }
                    else if (state.step === 4) { set("offerPlans", "later"); set("step", 5); }
                    else if (state.step === 5) { set("skipPayments", true); void submit(true); }
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="text-sm font-medium text-white/60 hover:text-white transition-colors"
                  disabled={submitting}
                >
                  {state.step === 5 ? "Skip for now" : state.step === 4 ? "Set up later" : "I'll add these later"}
                </button>
              )}
              <Button
                type="button"
                className="h-11 px-6 font-semibold text-white"
                style={{ background: GREEN }}
                onClick={next}
                disabled={submitting}
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Setting up…</>
                ) : state.step === 5 ? (
                  <>Complete setup <ArrowRight className="w-4 h-4 ml-1.5" /></>
                ) : (
                  <>Continue <ArrowRight className="w-4 h-4 ml-1.5" /></>
                )}
              </Button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

// ── Progress indicator ──────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
      {STEPS.map((s, i) => {
        const done = current > s.n;
        const active = current === s.n;
        return (
          <div key={s.n} className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={{
                  background: done || active ? GREEN : "rgba(255,255,255,0.08)",
                  color: done || active ? "white" : "rgba(255,255,255,0.4)",
                  boxShadow: active ? "0 0 0 4px rgba(34,197,94,0.18)" : undefined,
                }}
              >
                {done ? <Check className="w-4 h-4" /> : s.n}
              </div>
              <span className={cn("text-[10px] font-medium hidden sm:block", active ? "text-white" : "text-white/40")}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="w-4 sm:w-10 h-px -mt-4" style={{ background: done ? "#22C55E" : "rgba(255,255,255,0.12)" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Shared bits ───────────────────────────────────────────────────────────────

function StepHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h1>
      <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}

function ChoiceCard({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl border-2 px-4 py-3 transition-all",
        active ? "border-emerald-500 bg-emerald-50/60" : "border-gray-200 hover:border-gray-300 bg-white"
      )}
    >
      {children}
    </button>
  );
}

// ── Step 1: Your space ──────────────────────────────────────────────────────

function Step1({ state, set, currency, vat, cities }: {
  state: WizardState; set: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void;
  currency: string; vat: string; cities: string[];
}) {
  return (
    <div>
      <StepHeading title="Tell us about your space" subtitle="The basics — we'll tailor VAT, currency, and city options to your country." />
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="ob-name">Space / business name</Label>
          <Input id="ob-name" className="h-11" placeholder="e.g. LaunchHub Coworking"
            value={state.spaceName} onChange={(e) => set("spaceName", e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Business type</Label>
          <div className="grid grid-cols-2 gap-2">
            {BUSINESS_TYPES.map((t) => (
              <ChoiceCard key={t} active={state.businessType === t} onClick={() => set("businessType", t)}>
                <span className="text-sm font-medium text-gray-800">{t}</span>
              </ChoiceCard>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Country</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["UAE", "KSA"] as Jurisdiction[]).map((j) => (
              <ChoiceCard key={j} active={state.jurisdiction === j}
                onClick={() => { set("jurisdiction", j); set("city", ""); }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">
                    {j === "UAE" ? "🇦🇪 United Arab Emirates" : "🇸🇦 Saudi Arabia"}
                  </span>
                </div>
                <span className="text-[11px] text-gray-500">
                  {j === "UAE" ? "AED · 5% VAT" : "SAR · 15% VAT"}
                </span>
              </ChoiceCard>
            ))}
          </div>
          <p className="text-[11px] text-gray-400">
            Sets your currency (<strong>{currency}</strong>) and VAT rate (<strong>{vat}</strong>). You can&apos;t change this later without contacting support.
          </p>
        </div>

        <div className="space-y-2">
          <Label>City</Label>
          <div className="flex flex-wrap gap-2">
            {cities.map((c) => (
              <button key={c} type="button" onClick={() => set("city", c)}
                className={cn("px-3.5 py-2 rounded-lg text-sm font-medium border-2 transition-all",
                  state.city === c ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-600 hover:border-gray-300")}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ob-phone">Phone number</Label>
            <Input id="ob-phone" className="h-11" placeholder={state.jurisdiction === "KSA" ? "+966 5X XXX XXXX" : "+971 5X XXX XXXX"}
              value={state.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ob-wa">WhatsApp number</Label>
            <Input id="ob-wa" className="h-11" placeholder="Used for member messaging"
              value={state.sameWhatsApp ? state.phone : state.whatsappNumber}
              disabled={state.sameWhatsApp}
              onChange={(e) => set("whatsappNumber", e.target.value)} />
            <label className="flex items-center gap-2 text-[12px] text-gray-500 cursor-pointer select-none">
              <input type="checkbox" className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                checked={state.sameWhatsApp} onChange={(e) => set("sameWhatsApp", e.target.checked)} />
              Same as phone number
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Step 2: First location ──────────────────────────────────────────────────

function Step2({ state, set }: {
  state: WizardState; set: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void;
}) {
  const setDay = (key: string, patch: Partial<DayHours>) =>
    set("openingHours", { ...state.openingHours, [key]: { ...state.openingHours[key]!, ...patch } });

  return (
    <div>
      <StepHeading title="Your first location" subtitle="Where members check in and book. You can add more locations later based on your plan." />
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ob-loc">Location name</Label>
            <Input id="ob-loc" className="h-11" placeholder="Main Branch"
              value={state.locationName} onChange={(e) => set("locationName", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ob-addr">Full address</Label>
            <Input id="ob-addr" className="h-11" placeholder="Building, street, area"
              value={state.address} onChange={(e) => set("address", e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Opening hours</Label>
          <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
            {DAYS.map((d) => {
              const h = state.openingHours[d.key]!;
              return (
                <div key={d.key} className="flex items-center gap-3 px-3 sm:px-4 py-2.5">
                  <span className="w-20 sm:w-24 text-sm font-medium text-gray-700 flex-shrink-0">{d.label}</span>
                  <button type="button" onClick={() => setDay(d.key, { closed: !h.closed })}
                    className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 transition-colors",
                      h.closed ? "bg-gray-100 text-gray-400" : "bg-emerald-50 text-emerald-700")}>
                    {h.closed ? "Closed" : "Open"}
                  </button>
                  {!h.closed && (
                    <div className="flex items-center gap-2 ml-auto">
                      <Input type="time" value={h.open} onChange={(e) => setDay(d.key, { open: e.target.value })}
                        className="h-9 w-[110px] text-sm" />
                      <span className="text-gray-300 text-sm">–</span>
                      <Input type="time" value={h.close} onChange={(e) => setDay(d.key, { close: e.target.value })}
                        className="h-9 w-[110px] text-sm" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Step 3: Offerings ───────────────────────────────────────────────────────

function Step3({ state, setState, currency }: {
  state: WizardState; setState: React.Dispatch<React.SetStateAction<WizardState>>; currency: string;
}) {
  const update = (key: ResourceTypeKey, patch: Partial<ResourceEntry>) =>
    setState((s) => ({ ...s, resources: { ...s.resources, [key]: { ...s.resources[key], ...patch } } }));

  return (
    <div>
      <StepHeading title="What do you offer?" subtitle="Pick everything you rent or provide. We'll create these so members can start booking." />
      <div className="space-y-2.5">
        {RESOURCE_OPTIONS.map((o) => {
          const r = state.resources[o.key];
          const Icon = o.icon;
          return (
            <div key={o.key}
              className={cn("rounded-xl border-2 transition-all overflow-hidden",
                r.enabled ? "border-emerald-500 bg-emerald-50/40" : "border-gray-200")}>
              <button type="button" onClick={() => update(o.key, { enabled: !r.enabled })}
                className="w-full flex items-center gap-3 px-4 py-3 text-left">
                <span className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                  r.enabled ? "bg-emerald-100" : "bg-gray-100")}>
                  <Icon className={cn("w-4.5 h-4.5", r.enabled ? "text-emerald-700" : "text-gray-400")} style={{ width: 18, height: 18 }} />
                </span>
                <span className="flex-1 text-sm font-medium text-gray-900">{o.label}</span>
                <span className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0",
                  r.enabled ? "bg-emerald-500 border-emerald-500" : "border-gray-300")}>
                  {r.enabled && <Check className="w-3 h-3 text-white" />}
                </span>
              </button>

              {r.enabled && (
                <div className="px-4 pb-3 pt-1 flex flex-wrap items-end gap-3 border-t border-emerald-100/70">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-gray-500">Quantity</Label>
                    <Input type="number" min={1} className="h-9 w-24 text-sm"
                      value={r.quantity} onChange={(e) => update(o.key, { quantity: e.target.value })} />
                  </div>
                  {o.prices.map((p) => (
                    <div key={p.field} className="space-y-1">
                      <Label className="text-[11px] text-gray-500">{PRICE_FIELD_LABELS[p.field]} ({currency})</Label>
                      <Input type="number" min={0} className="h-9 w-28 text-sm" placeholder={p.placeholder}
                        value={r[p.field]}
                        onChange={(e) => update(o.key, { [p.field]: e.target.value } as Partial<ResourceEntry>)} />
                    </div>
                  ))}
                  {o.prices.length === 0 && (
                    <p className="text-[11px] text-gray-400 pb-2">Included with membership — no separate charge.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Step 4: Plans ─────────────────────────────────────────────────────────────

function Step4({ state, setState, currency }: {
  state: WizardState; setState: React.Dispatch<React.SetStateAction<WizardState>>; currency: string;
}) {
  const setPlans = (plans: PlanRow[]) => setState((s) => ({ ...s, plans }));
  const addPlan = (row?: PlanRow) => {
    if (state.plans.length >= 3) { toast.error("You can add up to 3 plans during setup."); return; }
    setPlans([...state.plans, row ?? { name: "", type: "CUSTOM", price: "", billingCycle: "MONTHLY", includedCredits: "0" }]);
  };
  const updatePlan = (i: number, patch: Partial<PlanRow>) =>
    setPlans(state.plans.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const removePlan = (i: number) => setPlans(state.plans.filter((_, idx) => idx !== i));

  return (
    <div>
      <StepHeading title="Membership plans" subtitle="Recurring plans you bill members on. Optional — you can build these later." />

      <div className="grid grid-cols-3 gap-2 mb-5">
        {([["yes", "Yes, set up now"], ["no", "No plans"], ["later", "Set up later"]] as const).map(([v, lbl]) => (
          <ChoiceCard key={v} active={state.offerPlans === v} onClick={() => setState((s) => ({ ...s, offerPlans: v }))}>
            <span className="text-sm font-medium text-gray-800">{lbl}</span>
          </ChoiceCard>
        ))}
      </div>

      {state.offerPlans === "yes" && (
        <div className="space-y-4">
          {/* Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Quick add:</span>
            {PLAN_PRESETS.map((p) => (
              <button key={p.label} type="button" onClick={() => addPlan({ ...p.row })}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors">
                + {p.label}
              </button>
            ))}
          </div>

          {state.plans.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-gray-200 px-4 py-8 text-center">
              <p className="text-sm text-gray-400">No plans yet — use a quick-add above or build one from scratch.</p>
            </div>
          )}

          {state.plans.map((p, i) => (
            <div key={i} className="rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400">Plan {i + 1}</span>
                <button type="button" onClick={() => removePlan(i)} className="text-gray-300 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-gray-500">Plan name</Label>
                  <Input className="h-10 text-sm" placeholder="e.g. Hot Desk Monthly"
                    value={p.name} onChange={(e) => updatePlan(i, { name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-gray-500">Price ({currency})</Label>
                  <Input type="number" min={0} className="h-10 text-sm" placeholder="500"
                    value={p.price} onChange={(e) => updatePlan(i, { price: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-gray-500">Billing cycle</Label>
                  <select className="h-10 w-full rounded-md border border-gray-200 px-3 text-sm bg-white"
                    value={p.billingCycle} onChange={(e) => updatePlan(i, { billingCycle: e.target.value as PlanRow["billingCycle"] })}>
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-gray-500">Booking credits / month</Label>
                  <Input type="number" min={0} className="h-10 text-sm" placeholder="0"
                    value={p.includedCredits} onChange={(e) => updatePlan(i, { includedCredits: e.target.value })} />
                </div>
              </div>
            </div>
          ))}

          {state.plans.length < 3 && (
            <button type="button" onClick={() => addPlan()}
              className="w-full rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm font-medium text-gray-500 hover:border-emerald-300 hover:text-emerald-600 transition-colors flex items-center justify-center gap-1.5">
              <Plus className="w-4 h-4" /> Add a plan
            </button>
          )}
        </div>
      )}

      {state.offerPlans !== "yes" && (
        <p className="text-sm text-gray-400 text-center py-4">
          {state.offerPlans === "no" ? "No problem — you can bill members per booking instead." : "You can create plans anytime from Plans in the dashboard."}
        </p>
      )}
    </div>
  );
}

// ── Step 5: Payments ──────────────────────────────────────────────────────────

function Step5({ state, set, currency }: {
  state: WizardState; set: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void; currency: string;
}) {
  const isKSA = state.jurisdiction === "KSA";
  return (
    <div>
      <StepHeading title="How will you collect payments?" subtitle={`You're set up for ${state.jurisdiction} — ${currency}. Connect a gateway now or skip and add it later.`} />

      <div className="space-y-5">
        {/* Tap */}
        <div className="rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Tap Payments</p>
              <p className="text-[12px] text-gray-500">Cards, Apple Pay, and local methods across the GCC.</p>
            </div>
            <a href="https://www.tap.company" target="_blank" rel="noopener noreferrer"
              className="text-[12px] font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1">
              Get your API key <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="mt-3 space-y-1.5">
            <Label className="text-[11px] text-gray-500">Tap secret key</Label>
            <Input className="h-10 text-sm font-mono" placeholder="sk_live_..."
              value={state.tapSecretKey} onChange={(e) => set("tapSecretKey", e.target.value)} />
          </div>
        </div>

        {/* Moyasar (KSA) */}
        {isKSA && (
          <div className="rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Moyasar <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded ml-1">Recommended for KSA</span></p>
                <p className="text-[12px] text-gray-500">Best Mada and STC Pay coverage for Saudi customers.</p>
              </div>
              <a href="https://moyasar.com" target="_blank" rel="noopener noreferrer"
                className="text-[12px] font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1">
                Get key <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="mt-3 space-y-1.5">
              <Label className="text-[11px] text-gray-500">Moyasar API key</Label>
              <Input className="h-10 text-sm font-mono" placeholder="sk_live_..."
                value={state.moyasarApiKey} onChange={(e) => set("moyasarApiKey", e.target.value)} />
            </div>
          </div>
        )}

        {/* Bank transfer */}
        <div className={cn("rounded-xl border-2 transition-all", state.acceptBank ? "border-emerald-500 bg-emerald-50/40" : "border-gray-200")}>
          <button type="button" onClick={() => set("acceptBank", !state.acceptBank)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left">
            <span className="flex-1 text-sm font-medium text-gray-900">Also accept bank transfers</span>
            <span className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0",
              state.acceptBank ? "bg-emerald-500 border-emerald-500" : "border-gray-300")}>
              {state.acceptBank && <Check className="w-3 h-3 text-white" />}
            </span>
          </button>
          {state.acceptBank && (
            <div className="px-4 pb-4 pt-1 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-emerald-100/70">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-gray-500">Bank name</Label>
                <Input className="h-10 text-sm" placeholder="e.g. Emirates NBD"
                  value={state.bankName} onChange={(e) => set("bankName", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-gray-500">IBAN</Label>
                <Input className="h-10 text-sm font-mono" placeholder={state.jurisdiction === "KSA" ? "SA…" : "AE…"}
                  value={state.iban} onChange={(e) => set("iban", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-gray-500">Account name</Label>
                <Input className="h-10 text-sm" placeholder="Account holder"
                  value={state.accountName} onChange={(e) => set("accountName", e.target.value)} />
              </div>
            </div>
          )}
        </div>

        <p className="text-[11px] text-gray-400 text-center">
          🔒 API keys are encrypted at rest. Prefer to do this later? Use <span className="font-semibold">Skip for now</span> below.
        </p>
      </div>
    </div>
  );
}

// ── Step 6: Done ───────────────────────────────────────────────────────────────

function Step6({ summary, currency, onDashboard, onInvite }: {
  summary: {
    locationName: string; resourcesCreated: number; virtualOfficeCreated: number;
    plansCreated: number; paymentsConfigured: boolean; jurisdiction: string; currency: string;
  } | null;
  currency: string;
  onDashboard: () => void;
  onInvite: () => void;
}) {
  const cur = summary?.currency ?? currency;
  const jur = summary?.jurisdiction ?? "UAE";
  const vat = jur === "KSA" ? "15%" : "5%";
  const rows = [
    { label: "Location", value: summary?.locationName ?? "Created", show: true },
    { label: "Resources created", value: String(summary?.resourcesCreated ?? 0), show: (summary?.resourcesCreated ?? 0) > 0 },
    { label: "Virtual office addresses", value: String(summary?.virtualOfficeCreated ?? 0), show: (summary?.virtualOfficeCreated ?? 0) > 0 },
    { label: "Membership plans", value: String(summary?.plansCreated ?? 0), show: (summary?.plansCreated ?? 0) > 0 },
    { label: "Payments", value: summary?.paymentsConfigured ? "Configured" : "Skipped — add later", show: true },
    { label: "Jurisdiction", value: `${jur} · ${cur} · ${vat} VAT`, show: true },
  ].filter((r) => r.show);

  return (
    <div className="text-center py-4">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: GREEN }}>
        <PartyPopper className="w-8 h-8 text-white" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900">You&apos;re all set! 🎉</h1>
      <p className="text-sm text-gray-500 mt-1.5">Here&apos;s what we just created for your space.</p>

      <div className="mt-6 max-w-md mx-auto rounded-xl border border-gray-100 divide-y divide-gray-50 text-left">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-3 px-4 py-3">
            <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span className="text-sm text-gray-500 flex-1">{r.label}</span>
            <span className="text-sm font-semibold text-gray-900 text-right">{r.value}</span>
          </div>
        ))}
      </div>

      <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Button className="h-11 px-6 font-semibold text-white w-full sm:w-auto" style={{ background: GREEN }} onClick={onDashboard}>
          Open your dashboard <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
        <Button variant="outline" className="h-11 px-6 w-full sm:w-auto" onClick={onInvite}>
          Invite your first member
        </Button>
      </div>
    </div>
  );
}
