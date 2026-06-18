import { inngest } from "@/lib/inngest";
import { runDailyReminders } from "@/lib/jobs/reminders";
import { captureServerError } from "@/lib/observability";

/**
 * Daily reminders — runs at 07:00 UTC every day, and on demand via the
 * `reminders/daily.run` event (Automations page or /api/cron/daily-reminders).
 *
 * Covers: visa expiry, document expiry, virtual-office renewal, trade-license
 * expiry, and overdue document requests. Each notification is deduplicated by
 * a configurable window (REMINDER_DEDUPE_DAYS, default 14), so running daily
 * never double-notifies members.
 *
 * Retries: 3 attempts with exponential backoff.
 * Dead-letter: Sentry alert on final failure. A missed day is recoverable —
 * the next day's run will catch anything that was skipped.
 */
export const dailyReminders = inngest.createFunction(
  {
    id: "daily-reminders",
    name: "Daily reminders",
    retries: 3,
    triggers: [
      { cron: "0 7 * * *" },           // every day at 07:00 UTC
      { event: "reminders/daily.run" }, // manual / fallback trigger
    ],
    onFailure: async ({ error }) => {
      const err = error instanceof Error ? error : new Error(String(error));
      captureServerError(err, {
        job: "daily-reminders",
        phase: "dead-letter",
        action: "Missed reminder run — next scheduled run will catch up. Manual trigger available via Automations.",
        date: new Date().toISOString().slice(0, 10),
      });
      console.error(
        JSON.stringify({
          level: "dead-letter",
          job: "daily-reminders",
          msg: err.message,
          ts: new Date().toISOString(),
        })
      );
    },
  },
  async ({ step }) => {
    // Idempotent — dedupe window prevents double-notifications even if the
    // job runs multiple times in a day (manual trigger + scheduled).
    const result = await step.run("run-reminders", () => runDailyReminders());
    return result;
  }
);
