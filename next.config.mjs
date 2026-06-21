import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lint is enforced separately (npm run lint). Don't let style-level
  // ESLint errors (unused vars, explicit any) block production builds.
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
    // Required for instrumentation.ts (Sentry server/edge init) in Next.js 14.
    instrumentationHook: true,
  },
  // Bundle @base-ui/react through Next.js compiler so it shares
  // the same React instance — prevents duplicate context errors
  transpilePackages: ["@base-ui/react"],

  // ── Security headers ─────────────────────────────────────────────────────
  //
  // CSP strategy: report-only first, enforce later.
  //
  // Content-Security-Policy-Report-Only does NOT block anything — it sends
  // violation reports to /api/csp-report so we can see exactly what a strict
  // CSP would break before enabling enforcement. When the violation feed is
  // quiet, flip this to Content-Security-Policy.
  //
  // 'unsafe-inline' in script-src / style-src: required right now because:
  //   - Next.js App Router injects inline <script> tags for hydration data
  //   - Tailwind and the marketing page use heavy inline styles
  // To remove these, every inline script needs a nonce (large refactor) and
  // every inline style must move to a class. That's Phase 4+ work.
  //
  // Origins included:
  //   *.supabase.co + wss  — Auth, DB, Storage, Realtime
  //   *.ingest.sentry.io   — Sentry client error + replay uploads
  //   lh3.googleusercontent.com / avatars.githubusercontent.com — user avatars
  //   Tap / WhatsApp / Inngest are server-to-server only; browsers never call
  //   those APIs directly, so they don't belong in the CSP.
  async headers() {
    const csp = [
      "default-src 'self'",
      // Next.js hydration + any remaining inline scripts. Remove 'unsafe-inline'
      // once nonces are added to every _next inline script.
      "script-src 'self' 'unsafe-inline'",
      // Tailwind utilities + marketing page inline styles.
      "style-src 'self' 'unsafe-inline'",
      // Same-origin images + data URIs (QR codes) + blobs (upload previews)
      // + Supabase Storage + Google/GitHub avatars.
      [
        "img-src 'self' data: blob:",
        "https://*.supabase.co",
        "https://lh3.googleusercontent.com",
        "https://avatars.githubusercontent.com",
      ].join(" "),
      // Self-hosted Arian LT font only.
      "font-src 'self'",
      // Fetch / XHR / WebSocket. wss for Supabase Realtime.
      [
        "connect-src 'self'",
        "https://*.supabase.co",
        "wss://*.supabase.co",
        "https://*.ingest.sentry.io",
      ].join(" "),
      // Blobs needed for MediaRecorder / webcam capture on check-in page.
      "media-src 'self' blob:",
      // Service workers (none yet, but blob: needed if we add a SW later).
      "worker-src 'self' blob:",
      // No iframes from external origins.
      "frame-src 'none'",
      // No plugins.
      "object-src 'none'",
      // Prevent <base> tag injection.
      "base-uri 'self'",
      // Forms must submit to same origin.
      "form-action 'self'",
      // Violations go to our logging endpoint (JSON, not enforced).
      "report-uri /api/csp-report",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          // Force HTTPS for 2 years incl. subdomains (browser-remembered).
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // Block being framed by other origins (clickjacking).
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Stop MIME-type sniffing.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Don't leak full URLs (which can carry ids) to other origins.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Disable powerful features by default; allow camera on same origin
          // only (the visitor/check-in webcam capture uses getUserMedia).
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=(), browsing-topics=()",
          },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          // Report-only CSP — logs violations without blocking anything.
          // When the report feed is quiet, change the key to
          // "Content-Security-Policy" to enforce.
          { key: "Content-Security-Policy-Report-Only", value: csp },
        ],
      },
    ];
  },
};

// Sentry webpack plugin — only active during production builds.
// Source maps are uploaded so stack traces in Sentry show real file/line refs.
// In dev (NODE_ENV !== production) withSentryConfig is still applied but
// tracing is disabled in the Sentry.init calls above, so nothing is sent.
export default withNextIntl(withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Silent during build — otherwise it spams the Vercel build log.
  silent: !process.env.CI,

  // Upload source maps so stack traces resolve to real file/line.
  // Source maps are NOT served to the browser.
  widenClientFileUpload: true,

  webpack: {
    // Tree-shake Sentry debug logging out of production client bundles.
    treeshake: { removeDebugLogging: true },
    // Wrap route handlers with Sentry tracing.
    autoInstrumentServerFunctions: true,
  },
}));
