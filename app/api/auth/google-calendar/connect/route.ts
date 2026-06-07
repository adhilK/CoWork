import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCalendarAuthUrl } from "@/lib/google-calendar";
import { apiError } from "@/lib/utils";

/**
 * GET /api/auth/google-calendar/connect
 * Redirects the logged-in member to Google's OAuth consent page
 * requesting calendar.events scope.
 */
export async function GET(_req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  // Encode the userId in state so the callback knows who to save the token for
  const state = Buffer.from(JSON.stringify({ userId: user.id })).toString("base64url");
  const url = getCalendarAuthUrl(state);

  return NextResponse.redirect(url);
}
