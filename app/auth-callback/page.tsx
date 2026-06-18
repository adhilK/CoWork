"use client";

/**
 * Client-side auth callback — handles invite links and magic-link sign-ins.
 *
 * After verifying the OTP, we always send the user to /onboarding.
 * That page has its own bypass logic:
 *   - Org with ≥1 location  → /dashboard (setup complete)
 *   - Member role           → /portal
 *   - No org or no location → show the 6-step wizard
 *
 * This covers all cases: new user confirming email, returning user
 * using a magic link, and team members accepting an invite.
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

      const { error } = await supabase.auth.verifyOtp({ token_hash, type });
      if (error) {
        console.error("[auth-callback] verifyOtp failed:", error.message);
        setStatus("error");
        return;
      }

      // /onboarding handles all post-auth routing via its bypass check.
      router.replace("/onboarding");
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
