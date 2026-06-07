"use client";

/**
 * Client-side auth callback — handles invite and magic-link sign-ins.
 *
 * Instead of relying on Supabase's redirect (which requires whitelisting
 * URLs and uses an unreadable hash fragment), we build our own link:
 *
 *   /auth-callback?token_hash=<hashed_token>&type=<verification_type>
 *
 * The hashed_token comes from supabase.auth.admin.generateLink().
 * We then call supabase.auth.verifyOtp() CLIENT-SIDE, which can set
 * cookies correctly and doesn't need hash fragments.
 *
 * Routing after sign-in:
 *   - User has a member record  → /portal
 *   - User has no member record → /dashboard (admin/owner)
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    const supabase = createClient();

    async function handleCallback() {
      // Read token_hash and type from our custom query params
      const params = new URLSearchParams(window.location.search);
      const token_hash = params.get("token_hash");
      const type = params.get("type") as
        | "invite"
        | "magiclink"
        | "signup"
        | "recovery"
        | "email_change"
        | "email"
        | null;

      if (!token_hash || !type) {
        setStatus("error");
        return;
      }

      // Verify the OTP client-side — Supabase sets session cookies here
      const { error } = await supabase.auth.verifyOtp({ token_hash, type });
      if (error) {
        console.error("[auth-callback] verifyOtp failed:", error.message);
        setStatus("error");
        return;
      }

      // Determine where to send the user
      try {
        const res = await fetch("/api/portal/me");
        if (res.ok) {
          router.replace("/portal?welcome=1");
        } else {
          router.replace("/dashboard");
        }
      } catch {
        router.replace("/dashboard");
      }
    }

    handleCallback();
  }, []);

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-gray-50">
        <div className="text-center space-y-3">
          <p className="text-2xl">🔗</p>
          <p className="font-semibold text-gray-800">Link expired or already used</p>
          <p className="text-sm text-gray-500">
            Invite links are single-use and expire after 24 hours.
          </p>
          <a
            href="/forgot-password"
            className="inline-block text-sm font-semibold underline underline-offset-2"
            style={{ color: "#15803D" }}
          >
            Get a new sign-in link →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3 bg-gray-50">
      <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      <p className="text-gray-500 text-sm">Signing you in…</p>
    </div>
  );
}
