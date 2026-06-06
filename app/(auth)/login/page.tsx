import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in — CoWork Pro",
  description: "Sign in to your CoWork Pro account to manage your coworking space.",
};

export default function LoginPage() {
  return (
    <div className="space-y-8">
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

      <p className="text-center text-sm text-gray-500">
        Don&apos;t have an account?{" "}
        <a
          href="/register"
          className="font-semibold transition-colors"
          style={{ color: "#22C55E" }}
        >
          Start your 14-day free trial →
        </a>
      </p>
    </div>
  );
}
