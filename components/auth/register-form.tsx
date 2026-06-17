"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Check, Building2, User, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { registerSchema, type RegisterInput } from "@/lib/validations";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Your account", icon: User },
  { id: 2, label: "Your space", icon: Building2 },
  { id: 3, label: "All set!", icon: Rocket },
];

const TIMEZONES = [
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Riyadh", label: "Riyadh (AST)" },
  { value: "Asia/Bahrain", label: "Bahrain (AST)" },
  { value: "Asia/Qatar", label: "Doha (AST)" },
  { value: "Asia/Kuwait", label: "Kuwait (AST)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
];

const CURRENCIES = [
  { value: "AED", label: "AED — UAE Dirham" },
  { value: "SAR", label: "SAR — Saudi Riyal" },
  { value: "USD", label: "$ USD — US Dollar" },
  { value: "EUR", label: "€ EUR — Euro" },
  { value: "GBP", label: "£ GBP — British Pound" },
];

// GCC jurisdiction — drives VAT rate, currency, license catalogs, gov bodies.
const JURISDICTIONS = [
  { value: "UAE", label: "🇦🇪 United Arab Emirates", currency: "AED", timezone: "Asia/Dubai" },
  { value: "KSA", label: "🇸🇦 Saudi Arabia", currency: "SAR", timezone: "Asia/Riyadh" },
] as const;

export function RegisterForm() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema) as any,
    defaultValues: {
      orgTimezone: "Asia/Dubai",
      orgCurrency: "AED",
      orgJurisdiction: "UAE",
    },
  });

  async function goToStep2() {
    const valid = await trigger(["name", "email", "password"]);
    if (valid) setStep(2);
  }

  async function onSubmit(data: RegisterInput) {
    setIsLoading(true);
    try {
      // 1. Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { name: data.name },
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No user returned");

      // Detect if Supabase requires email confirmation:
      // When confirmation is needed, identities array comes back empty
      const needsEmailConfirmation =
        !authData.user.confirmed_at &&
        Array.isArray(authData.user.identities) &&
        authData.user.identities.length === 0;

      if (!needsEmailConfirmation) {
        // Already confirmed (email confirmations disabled) — create org record
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: authData.user.id,
            name: data.name,
            email: data.email,
            orgName: data.orgName,
            orgSlug: slugify(data.orgName),
            orgTimezone: data.orgTimezone,
            orgCurrency: data.orgCurrency,
            orgJurisdiction: data.orgJurisdiction,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "Failed to create organization");
        }
      } else {
        setEmailSent(true);
      }

      setStep(3);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      {step < 3 && (
        <div className="flex items-center gap-2">
          {STEPS.slice(0, 2).map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={{
                  background: step >= s.id ? "#22C55E" : "#E5E7EB",
                  color: step >= s.id ? "white" : "#6B7280",
                }}
              >
                {step > s.id ? <Check className="w-3.5 h-3.5" /> : s.id}
              </div>
              <span
                className="text-sm font-medium"
                style={{ color: step >= s.id ? "#111827" : "#9CA3AF" }}
              >
                {s.label}
              </span>
              {i < 1 && (
                <div
                  className="h-px flex-1 w-8 mx-1"
                  style={{ background: step > 1 ? "#22C55E" : "#E5E7EB" }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* ── Step 1: Account ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reg-name">Full name</Label>
              <Input id="reg-name" placeholder="Alex Morgan" className="h-11" {...register("name")} />
              {errors.name && <p className="text-sm text-danger">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-email">Work email</Label>
              <Input id="reg-email" type="email" placeholder="alex@company.com" className="h-11" {...register("email")} />
              {errors.email && <p className="text-sm text-danger">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-password">Password</Label>
              <Input id="reg-password" type="password" placeholder="Min. 8 chars, upper + number" className="h-11" {...register("password")} />
              {errors.password && <p className="text-sm text-danger">{errors.password.message}</p>}
            </div>
            <Button
              type="button"
              id="register-next-btn"
              className="w-full h-11 font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}
              onClick={goToStep2}
            >
              Continue →
            </Button>
          </div>
        )}

        {/* ── Step 2: Space ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Jurisdiction</Label>
              <Select
                defaultValue="UAE"
                onValueChange={(v) => {
                  const j = JURISDICTIONS.find((x) => x.value === v) ?? JURISDICTIONS[0];
                  setValue("orgJurisdiction", j.value);
                  // Sensible defaults for the chosen jurisdiction
                  setValue("orgCurrency", j.currency);
                  setValue("orgTimezone", j.timezone);
                }}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JURISDICTIONS.map((j) => (
                    <SelectItem key={j.value} value={j.value}>
                      {j.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400">
                Sets your VAT rate ({watch("orgJurisdiction") === "KSA" ? "15%" : "5%"}), currency, and government bodies.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-orgName">Space name</Label>
              <Input id="reg-orgName" placeholder="LaunchHub Coworking" className="h-11" {...register("orgName")} />
              {errors.orgName && <p className="text-sm text-danger">{errors.orgName.message}</p>}
              {watch("orgName") && (
                <p className="text-xs text-gray-400">
                  URL: Maktaby.io/<strong>{slugify(watch("orgName") ?? "")}</strong>
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select
                value={watch("orgTimezone")}
                onValueChange={(v) => setValue("orgTimezone", v ?? "Asia/Dubai")}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={watch("orgCurrency")}
                onValueChange={(v) => setValue("orgCurrency", v ?? "AED")}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1 h-11" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                type="submit"
                id="register-submit-btn"
                className="flex-1 h-11 font-semibold text-white"
                style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create my space →"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Success or Confirm Email */}
        {step === 3 && (
          <div className="text-center space-y-6 py-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
              style={{
                background: emailSent
                  ? "linear-gradient(135deg, #1D4ED8, #6366F1)"
                  : "linear-gradient(135deg, #15803D, #22C55E)",
              }}
            >
              {emailSent ? (
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              ) : (
                <Rocket className="w-8 h-8 text-white" />
              )}
            </div>
            <div>
              {emailSent ? (
                <>
                  <h2 className="text-2xl font-bold text-gray-900">Check your inbox!</h2>
                  <p className="mt-2 text-gray-500">
                    We&apos;ve sent a confirmation link to your email address.<br />
                    Click it to activate your account, then sign in.
                  </p>
                  <p className="mt-3 text-xs text-gray-400">Didn&apos;t get it? Check your spam folder.</p>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-gray-900">You&apos;re all set!</h2>
                  <p className="mt-2 text-gray-500">
                    Your 14-day free trial has started. Let&apos;s set up your space.
                  </p>
                </>
              )}
            </div>
            {emailSent ? (
              <Button
                type="button"
                variant="outline"
                className="w-full h-11"
                onClick={() => (window.location.href = "/login")}
              >
                Back to sign in
              </Button>
            ) : (
              <Button
                type="button"
                id="register-dashboard-btn"
                className="w-full h-11 font-semibold text-white"
                style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}
                onClick={() => (window.location.href = "/dashboard")}
              >
                Go to Dashboard →
              </Button>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
