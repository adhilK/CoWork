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
};

export default nextConfig;
