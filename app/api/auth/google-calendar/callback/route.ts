import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exchangeCodeForTokens } from "@/lib/google-calendar";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://Maktaby.vercel.app";

/**
 * GET /api/auth/google-calendar/callback?code=xxx&state=xxx
 * Google redirects here after the user grants (or denies) calendar access.
 * Exchanges the code for tokens and persists the refresh token on the User row.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const code = sp.get("code");
  const state = sp.get("state");
  const error = sp.get("error");

  // User denied access
  if (error || !code || !state) {
    return NextResponse.redirect(`${APP_URL}/portal/profile?calendar=denied`);
  }

  // Decode state to get userId
  let userId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
    userId = decoded.userId;
    if (!userId) throw new Error("no userId");
  } catch {
    return NextResponse.redirect(`${APP_URL}/portal/profile?calendar=error`);
  }

  // Exchange auth code for tokens
  let refreshToken: string | null;
  try {
    const tokens = await exchangeCodeForTokens(code);
    refreshToken = tokens.refreshToken;
  } catch {
    return NextResponse.redirect(`${APP_URL}/portal/profile?calendar=error`);
  }

  if (!refreshToken) {
    // This happens if the user already granted access before and Google didn't re-issue a refresh token.
    // The existing token in the DB is still valid — treat as success.
    return NextResponse.redirect(`${APP_URL}/portal/profile?calendar=connected`);
  }

  // Persist the refresh token
  await prisma.user.update({
    where: { id: userId },
    data: { googleCalendarRefreshToken: refreshToken },
  });

  return NextResponse.redirect(`${APP_URL}/portal/profile?calendar=connected`);
}
