/**
 * Server error capture seam.
 *
 * Emits a structured JSON line to stdout (always — greppable in Vercel logs)
 * and, in production, forwards to Sentry for alerting + grouping.
 *
 * Serverless note: Sentry.flush() is called as fire-and-forget after every
 * captureException. This gives the SDK a head-start on sending before the
 * function exits. It is NOT guaranteed delivery — for critical paths (e.g.
 * the sentry-test route) call `await Sentry.flush(2000)` explicitly after
 * this function returns.
 */

import * as Sentry from "@sentry/nextjs";

type ErrorContext = Record<string, string | number | boolean | null | undefined>;

export function captureServerError(error: unknown, context?: ErrorContext): void {
  const err = error instanceof Error ? error : new Error(String(error));

  // Structured, single-line — easy to filter in Vercel logs.
  console.error(
    JSON.stringify({
      level: "error",
      msg: err.message,
      name: err.name,
      stack: err.stack?.split("\n").slice(0, 8).join("\n"),
      ...context,
      ts: new Date().toISOString(),
    })
  );

  // Forward to Sentry in production only. No DSN guard here — if Sentry.init
  // wasn't called (no DSN configured), captureException is already a no-op.
  if (process.env.NODE_ENV === "production") {
    Sentry.captureException(err, { extra: context });
    // Fire-and-forget flush: gives the SDK time to send before the serverless
    // function exits. Does not block the caller. For guaranteed delivery, the
    // caller should await Sentry.flush(2000) after calling this function.
    Sentry.flush(2000).catch(() => {});
  }
}
