import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles Supabase email link flows: invite, magic link, email change,
 * password reset. Supabase redirects here with token_hash + type after the
 * user clicks their email link.
 *
 * Flow:
 *  1. Admin invites member → generateLink produces action_link pointing here
 *  2. Member clicks link → Supabase verifies token → redirects to this route
 *     with ?token_hash=XXX&type=invite
 *  3. We call verifyOtp to exchange the token for a session
 *  4. Redirect to `next` (defaults to /portal for invite links)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as
    | "signup"
    | "invite"
    | "magiclink"
    | "email_change"
    | "email"
    | "recovery"
    | null;
  const next = searchParams.get("next") ?? "/portal";

  if (token_hash && type) {
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      // For invite links, append ?welcome=1 so the portal can show a first-time banner
      const destination =
        type === "invite" && next === "/portal" ? `${next}?welcome=1` : next;
      return NextResponse.redirect(`${origin}${destination}`);
    }
    console.error("[auth/confirm] verifyOtp failed:", error.message);
  }

  // Invalid or expired token — send to login with a clear message
  return NextResponse.redirect(
    `${origin}/login?error=invalid_or_expired_link`
  );
}
