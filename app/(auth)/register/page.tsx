import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Create your space — CoWork Pro",
  description: "Start your 14-day free trial. No credit card required.",
};

export default function RegisterPage() {
  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Start your coworking space
        </h1>
        <p className="mt-2 text-gray-500">
          For operators setting up a new space on CoWork Pro · 14-day free trial, no card required
        </p>
      </div>
      <RegisterForm />
      <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3">
        <p className="text-xs text-amber-800">
          <span className="font-semibold">Joining an existing space?</span> Members and staff don&apos;t sign up here —
          your space invites you by email. Just open that link.
        </p>
      </div>
      <p className="text-center text-sm text-gray-500">
        Already have an account?{" "}
        <a href="/login" className="font-semibold" style={{ color: "#22C55E" }}>
          Sign in →
        </a>
      </p>
    </div>
  );
}
