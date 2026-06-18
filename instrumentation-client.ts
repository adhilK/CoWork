import * as Sentry from "@sentry/nextjs";

// Required for Sentry to capture navigation events in Next.js 14+.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

// Only enable Sentry in production — too noisy in dev, and we don't want to
// pollute the production event stream with local errors.
if (process.env.NODE_ENV === "production") {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,

    // Sample 100% of errors but only 10% of performance traces —
    // errors are cheap; traces add up fast.
    tracesSampleRate: 0.1,

    // Capture replays only on error sessions (5% baseline otherwise).
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.05,

    integrations: [
      Sentry.replayIntegration({
        // Never record passwords, card numbers, or Emirates/Iqama fields.
        maskAllText: true,
        blockAllMedia: false,
      }),
    ],

    // Silence browser extension noise that would clog the dashboard.
    ignoreErrors: [
      "Non-Error promise rejection captured",
      /^ResizeObserver loop/,
      /^ChunkLoadError/,
    ],
  });
}
