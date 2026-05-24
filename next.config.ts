import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    // Lint errors should not block production builds.
    // Run `npm run lint` locally to see and fix them.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Type errors should not block production builds.
    // Run `npm run typecheck` locally to see and fix them.
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "utfs.io" },
      { protocol: "https", hostname: "uploadthing.com" },
      { protocol: "https", hostname: "api.qrserver.com" },
    ],
  },
};

export default nextConfig;
