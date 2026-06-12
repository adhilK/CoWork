import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/utils";
import { runDailyReminders } from "@/lib/jobs/reminders";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily reminders — Vercel Cron fallback.
 *
 * The primary scheduler is Inngest (jobs/daily-reminders.ts). This route is the
 * no-Inngest fallback and a manual trigger. The logic is idempotent (dedupe
 * window), so it is safe to run alongside the Inngest schedule.
 *
 * Protected by CRON_SECRET.
 */
function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const bearer = req.headers.get("authorization");
  const custom = req.headers.get("x-cron-secret");
  return bearer === `Bearer ${secret}` || custom === secret;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return apiError("Unauthorized", 401);
  const result = await runDailyReminders();
  return apiSuccess({ ok: true, ...result });
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return apiError("Unauthorized", 401);
  const result = await runDailyReminders();
  return apiSuccess({ ok: true, ...result });
}
