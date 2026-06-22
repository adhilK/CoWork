import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth callback handler — Supabase redirects here after Google OAuth
 * or email-confirmation link clicks.
 *
 * On Vercel, `request.url` may carry an internal hostname (e.g. the
 * deployment origin), not the public domain (www.maktaby.io). Vercel sets
 * `x-forwarded-host` to the actual user-facing host, so we use that to
 * build the redirect URL so the session cookie domain matches the browser.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // /onboarding handles its own bypass: if org is already set up it sends
  // the user to /dashboard or /portal based on role.
  const next = searchParams.get("next") ?? "/onboarding";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Prefer the public-facing host so the redirect URL matches the
      // domain the browser sees and cookie domain constraints are satisfied.
      const forwardedHost = request.headers.get("x-forwarded-host");
      const redirectBase = forwardedHost
        ? `https://${forwardedHost}`
        : (process.env.NEXT_PUBLIC_APP_URL ?? origin);
      return NextResponse.redirect(`${redirectBase}${next}`);
    }
  }

  // Exchange failed — return to login with an error banner.
  const errorBase = process.env.NEXT_PUBLIC_APP_URL ?? origin;
  return NextResponse.redirect(`${errorBase}/login?error=oauth_callback_failed`);
}
