import { NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";
import { enqueue, jobsEnabled } from "@/lib/jobs";
import { runMonthlyBilling } from "@/lib/jobs/billing";
import { runDailyReminders } from "@/lib/jobs/reminders";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const schema = z.object({ job: z.enum(["monthly-billing", "daily-reminders"]) });

/**
 * Manually trigger a scheduled job. When Inngest is connected the run is queued
 * (returns immediately); otherwise the job runs inline and the result is
 * returned. Admin-only.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError("Invalid job");

  const { job } = parsed.data;

  // Queue via Inngest when available.
  if (jobsEnabled()) {
    const eventName = job === "monthly-billing" ? "billing/monthly.run" : "reminders/daily.run";
    const ok = await enqueue(eventName as any, { triggeredBy: auth.userId });
    if (ok) return apiSuccess({ queued: true, job });
  }

  // Inline fallback.
  const result = job === "monthly-billing" ? await runMonthlyBilling() : await runDailyReminders();
  return apiSuccess({ queued: false, job, result });
}
