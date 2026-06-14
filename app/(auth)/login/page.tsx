import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in — CoWork Pro",
  description: "Sign in to your CoWork Pro account to manage your coworking space.",
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid_or_expired_link:
    "That invite link has expired or is invalid. Ask your space admin to resend the invite.",
  oauth_callback_failed:
    "Google sign-in failed. Please try again.",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; redirectTo?: string };
}) {
  const errorMsg = searchParams.error
    ? (ERROR_MESSAGES[searchParams.error] ?? "Something went wrong. Please try again.")
    : null;

  return (
    <div className="space-y-8">
      {/* Error banner (e.g. expired invite link) */}
      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Welcome back
        </h1>
        <p className="mt-2 text-gray-500">
          Sign in to your CoWork Pro account
        </p>
      </div>

      <LoginForm />

      {/* Audience clarity — members/staff are invited, operators sign up */}
      <div className="space-y-3">
        <div className="rounded-xl border border-gray-100 bg-gray-50/70 px-4 py-3">
          <p className="text-xs text-gray-600">
            <span className="font-semibold text-gray-800">Member or staff?</span> You don&apos;t need to sign up —
            open the invite link emailed to you by your space, then sign in here.
          </p>
        </div>
        <p className="text-center text-sm text-gray-500">
          Run a coworking space?{" "}
          <a
            href="/register"
            className="font-semibold transition-colors"
            style={{ color: "#22C55E" }}
          >
            Start your 14-day free trial →
          </a>
        </p>
      </div>
    </div>
  );
}
