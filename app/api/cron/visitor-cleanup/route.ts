import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/utils";
import { runVisitorCleanup } from "@/lib/jobs/visitor-cleanup";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Visitor log cleanup — Vercel Cron fallback.
 *
 * The primary scheduler is Inngest (jobs/visitor-cleanup.ts). This route is
 * the no-Inngest fallback and a manual trigger. The operation is idempotent —
 * running it multiple times on the same day is safe.
 *
 * Vercel cron config (vercel.json):
 *   { "path": "/api/cron/visitor-cleanup", "schedule": "0 2 * * *" }
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
  const result = await runVisitorCleanup();
  return apiSuccess({ ok: true, ...result });
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return apiError("Unauthorized", 401);
  const result = await runVisitorCleanup();
  return apiSuccess({ ok: true, ...result });
}
