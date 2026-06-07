"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
  });
type FormData = z.infer<typeof schema>;

type Status = "exchanging" | "ready" | "done" | "error";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState<Status>("exchanging");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isMember, setIsMember] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    async function exchangeCode() {
      const params = new URLSearchParams(window.location.search);
      const token_hash = params.get("token_hash");
      const type = params.get("type") ?? "recovery";

      if (!token_hash) { setStatus("error"); return; }

      // Use verifyOtp with hashed_token — no PKCE verifier needed, works
      // across any browser / email client.
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as "recovery",
      });
      if (error) {
        console.error("[reset-password] verifyOtp:", error.message);
        setStatus("error");
        return;
      }

      // Check if user is a member (to redirect correctly after password set)
      try {
        const res = await fetch("/api/portal/me");
        setIsMember(res.ok);
      } catch { /* default to dashboard */ }

      setStatus("ready");
    }
    exchangeCode();
  }, []);

  async function onSubmit(data: FormData) {
    const { error } = await supabase.auth.updateUser({ password: data.password });
    if (error) {
      toast.error(error.message);
      return;
    }
    setStatus("done");
    setTimeout(() => {
      router.replace(isMember ? "/portal" : "/dashboard");
    }, 1500);
  }

  // ── Exchanging code ──────────────────────────────────────────────────────
  if (status === "exchanging") {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Set your password</h1>
          <p className="mt-2 text-gray-500">Verifying your link…</p>
        </div>
        <div className="flex justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (status === "error") {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Link expired</h1>
          <p className="mt-2 text-gray-500">
            This reset link has expired or already been used.
          </p>
        </div>
        <a
          href="/forgot-password"
          className="inline-block font-semibold text-sm underline underline-offset-2"
          style={{ color: "#15803D" }}
        >
          Request a new link →
        </a>
      </div>
    );
  }

  // ── Success ──────────────────────────────────────────────────────────────
  if (status === "done") {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle className="w-12 h-12 text-emerald-500" />
          <p className="font-semibold text-gray-900 text-lg">Password set!</p>
          <p className="text-sm text-gray-500">Redirecting you now…</p>
        </div>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Set your password</h1>
        <p className="mt-2 text-gray-500">Choose a password to use for future sign-ins.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className="h-11 pr-10"
              {...register("password")}
            />
            <button type="button" tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowPw(v => !v)}>
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <div className="relative">
            <Input
              id="confirm"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Repeat password"
              className="h-11 pr-10"
              {...register("confirm")}
            />
            <button type="button" tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowConfirm(v => !v)}>
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirm && <p className="text-sm text-red-500">{errors.confirm.message}</p>}
        </div>

        <Button type="submit" className="w-full h-11 font-semibold text-white"
          style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}
          disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Set password"}
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500">
        <a href="/login" className="font-semibold" style={{ color: "#15803D" }}>← Back to sign in</a>
      </p>
    </div>
  );
}
