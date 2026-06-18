import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth callback handler — Supabase redirects here after Google OAuth.
 * Exchanges the code for a session, then redirects to dashboard.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Default to root so the server routes by role (MEMBER → /portal,
  // OWNER/ADMIN → /dashboard) instead of dropping everyone on the admin shell.
  // Default to /onboarding — that page's bypass logic routes the user to
  // /dashboard, /portal, or the wizard based on their org state.
  const next = searchParams.get("next") ?? "/onboarding";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return to login with error
  return NextResponse.redirect(`${origin}/login?error=oauth_callback_failed`);
}
