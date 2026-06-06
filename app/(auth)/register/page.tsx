import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Create your space — CoWork Pro",
  description: "Start your 14-day free trial. No credit card required.",
};

export default function RegisterPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Create your space
        </h1>
        <p className="mt-2 text-gray-500">
          14-day free trial · No credit card required
        </p>
      </div>
      <RegisterForm />
      <p className="text-center text-sm text-gray-500">
        Already have an account?{" "}
        <a href="/login" className="font-semibold" style={{ color: "#22C55E" }}>
          Sign in →
        </a>
      </p>
    </div>
  );
}
