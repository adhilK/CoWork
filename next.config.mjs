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
  },
  // Bundle @base-ui/react through Next.js compiler so it shares
  // the same React instance — prevents duplicate context errors
  transpilePackages: ["@base-ui/react"],

  // Security headers applied to every response. These are the high-value,
  // zero-breakage headers. A strict Content-Security-Policy is intentionally
  // NOT set here yet: the app relies on inline styles and several third-party
  // origins (Supabase, Tap, Google), so a CSP must be tuned and verified
  // against the deployed site before enabling, or it silently breaks the UI.
  async headers() {
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
        ],
      },
    ];
  },
};

export default nextConfig;
