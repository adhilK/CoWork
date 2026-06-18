import { inngest } from "@/lib/inngest";
import { runMonthlyBilling } from "@/lib/jobs/billing";
import { captureServerError } from "@/lib/observability";

/**
 * Monthly billing — runs at 06:00 on the 1st of each month (UTC), and can
 * also be triggered on demand via the `billing/monthly.run` event (Automations
 * page or /api/cron/monthly-billing fallback).
 *
 * Retries: 3 attempts with Inngest's default exponential backoff (30s → 5m → 30m).
 * Dead-letter: on final failure after all retries, `onFailure` captures to Sentry
 * and logs a structured alert so the operator can see which billing period was
 * affected and manually trigger a re-run from the Automations page.
 *
 * The underlying `runMonthlyBilling()` is idempotent — it skips any member who
 * already has an invoice for the current period — so re-running after a partial
 * failure is always safe.
 */
export const monthlyBilling = inngest.createFunction(
  {
    id: "monthly-billing",
    name: "Monthly billing",
    retries: 3,
    triggers: [
      { cron: "0 6 1 * *" },        // 1st of every month at 06:00 UTC
      { event: "billing/monthly.run" }, // manual / fallback trigger
    ],
    onFailure: async ({ error }) => {
      // All 3 retries exhausted. Alert via Sentry so it becomes a tracked issue.
      // The operator should check the Automations page and trigger a manual re-run
      // from there — the job is idempotent so no member gets double-billed.
      const err = error instanceof Error ? error : new Error(String(error));
      captureServerError(err, {
        job: "monthly-billing",
        phase: "dead-letter",
        action: "Manual re-run required via Automations page — invoices may be missing for this period",
        period: new Date().toISOString().slice(0, 7), // e.g. "2026-06"
      });
      console.error(
        JSON.stringify({
          level: "dead-letter",
          job: "monthly-billing",
          msg: err.message,
          action: "Manual re-run required via Automations",
          ts: new Date().toISOString(),
        })
      );
    },
  },
  async ({ step }) => {
    // Single durable step wrapping the full billing run. On retry, Inngest
    // re-executes from here; the idempotency check inside runMonthlyBilling
    // skips any members already invoiced, so partial progress is preserved.
    const result = await step.run("run-billing", () => runMonthlyBilling());
    return result;
  }
);
