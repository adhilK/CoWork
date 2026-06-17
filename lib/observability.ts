/**
 * Lightweight server error capture.
 *
 * Emits a single structured JSON line per error so it is greppable in Vercel
 * logs immediately, with no external dependency. It is also the single seam to
 * forward to a real provider (Sentry, Axiom, etc.): when you add one, call it
 * from `captureServerError` — every server error already routes through here.
 *
 * Why not @sentry/nextjs now: it needs a DSN/account and changes the build
 * (instrumentation + source-map upload). Wiring the provider is a one-line
 * follow-up once the DSN is available; this seam means no call sites change.
 */

type ErrorContext = Record<string, string | number | boolean | null | undefined>;

export function captureServerError(error: unknown, context?: ErrorContext): void {
  const err = error instanceof Error ? error : new Error(String(error));
  // Structured, single-line — easy to filter in Vercel/CloudWatch.
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

  // Provider forwarding seam (add when a DSN is configured):
  //   if (process.env.SENTRY_DSN) Sentry.captureException(err, { extra: context });
}
