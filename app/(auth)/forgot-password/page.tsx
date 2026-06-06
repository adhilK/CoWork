import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Reset password — CoWork Pro" };

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Reset password</h1>
        <p className="mt-2 text-gray-500">
          Enter your email and we&apos;ll send a reset link.
        </p>
      </div>
      <ForgotPasswordForm />
      <p className="text-center text-sm text-gray-500">
        <a href="/login" className="font-semibold" style={{ color: "#22C55E" }}>
          ← Back to sign in
        </a>
      </p>
    </div>
  );
}
