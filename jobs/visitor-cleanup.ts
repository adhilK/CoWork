import { inngest } from "@/lib/inngest";
import { runVisitorCleanup } from "@/lib/jobs/visitor-cleanup";
import { captureServerError } from "@/lib/observability";

/**
 * Visitor log cleanup — runs at 02:00 UTC every day and on demand via the
 * `visitors/cleanup.run` event (manual or fallback cron).
 *
 * Soft-deletes visitor records older than VISITOR_CLEANUP_DAYS (default 90).
 * PDPL data minimisation compliance — visitor PII must not be retained
 * beyond operational necessity.
 *
 * Retries: 2 attempts. Failure of a single day's cleanup is non-critical;
 * the next scheduled run will catch up.
 */
export const visitorCleanup = inngest.createFunction(
  {
    id: "visitor-cleanup",
    name: "Visitor log cleanup (PDPL 90-day retention)",
    retries: 2,
    triggers: [
      { cron: "0 2 * * *" },              // every day at 02:00 UTC
      { event: "visitors/cleanup.run" },  // manual / fallback trigger
    ],
    onFailure: async ({ error }) => {
      const err = error instanceof Error ? error : new Error(String(error));
      captureServerError(err, {
        job: "visitor-cleanup",
        phase: "dead-letter",
        action: "Visitor cleanup failed — next scheduled run will catch up. Manual trigger via POST /api/cron/visitor-cleanup.",
        date: new Date().toISOString().slice(0, 10),
      });
      console.error(
        JSON.stringify({
          level: "dead-letter",
          job: "visitor-cleanup",
          msg: err.message,
          ts: new Date().toISOString(),
        })
      );
    },
  },
  async ({ step }) => {
    const result = await step.run("soft-delete-expired-visitors", () => runVisitorCleanup());
    return result;
  }
);
