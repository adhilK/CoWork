"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations";
export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } =
    useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(data: ForgotPasswordInput) {
    // Use our server endpoint which builds the link with hashed_token —
    // avoids PKCE verifier issues that break links opened from email clients.
    const res = await fetch("/api/auth/request-password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.email }),
    });
    if (!res.ok) { toast.error("Something went wrong. Please try again."); return; }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <Mail className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">Check your inbox</p>
          <p className="text-sm text-gray-500 mt-1">
            We sent a reset link to <strong>{watch("email")}</strong>
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fp-email">Email address</Label>
        <Input id="fp-email" type="email" placeholder="you@company.com" className="h-11" {...register("email")} />
        {errors.email && <p className="text-sm text-danger">{errors.email.message}</p>}
      </div>
      <Button type="submit" id="reset-submit-btn" className="w-full h-11 font-semibold text-white"
        style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }} disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
      </Button>
    </form>
  );
}
