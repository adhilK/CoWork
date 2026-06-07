"use client";

/**
 * Client-side auth callback page.
 *
 * Admin-generated magic/invite links (via supabase.auth.admin.generateLink)
 * use the implicit flow: after Supabase verifies the token it redirects here
 * with the session in the URL hash (#access_token=...&refresh_token=...).
 *
 * Server-side route handlers never see hash fragments, so we need this
 * client page. The Supabase JS SDK reads the hash automatically on load
 * and fires onAuthStateChange with event SIGNED_IN.
 *
 * We then redirect:
 *   - Members (who have a /portal member record) → /portal
 *   - Admins / others → /dashboard
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    // The Supabase client SDK parses the hash fragment on initialisation.
    // onAuthStateChange fires immediately if a session is detected.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session) {
          // Check if this user has a member record — if yes, send to portal.
          const res = await fetch("/api/portal/me");
          if (res.ok) {
            router.replace("/portal?welcome=1");
          } else {
            router.replace("/dashboard");
          }
          return;
        }
        if (event === "SIGNED_OUT" || (!session && event !== "INITIAL_SESSION")) {
          setStatus("error");
        }
      }
    );

    // Fallback: if no auth event fires within 5 s, show error
    const timeout = setTimeout(() => setStatus("error"), 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-gray-600 text-sm">
          This link has expired or already been used.
        </p>
        <a
          href="/forgot-password"
          className="text-sm font-semibold underline"
          style={{ color: "#15803D" }}
        >
          Request a new sign-in link →
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3">
      <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      <p className="text-gray-500 text-sm">Signing you in…</p>
    </div>
  );
}
