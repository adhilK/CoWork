import { inngest } from "@/lib/inngest";
import { runDailyReminders } from "@/lib/jobs/reminders";

/**
 * Daily reminders — runs at 07:00 every day, and on demand via the
 * `reminders/daily.run` event. Idempotent (dedupe window), so safe to re-run.
 */
export const dailyReminders = inngest.createFunction(
  {
    id: "daily-reminders",
    name: "Daily reminders",
    retries: 2,
    triggers: [{ cron: "0 7 * * *" }, { event: "reminders/daily.run" }],
  },
  async ({ step }) => {
    return step.run("run-reminders", () => runDailyReminders());
  }
);
