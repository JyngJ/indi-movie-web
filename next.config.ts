import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.188.20', 'http://192.168.188.20:3000', '100.120.113.87'],
  serverExternalPackages: ['playwright-chromium'],
  // Override Vercel's VERCEL_PROJECT_PRODUCTION_URL which may be set to a Korean punycode
  // domain (e.g. www.xn--939au0g4vj8sq7l.com) that Node.js 22+ rejects in new URL().
  // Next.js 16 reads this env var in getSocialImageMetadataBaseFallback when processing
  // opengraph-image.tsx static metadata routes. DefinePlugin replaces it at compile time.
  env: {
    VERCEL_PROJECT_PRODUCTION_URL: 'www.xn--hq1bv8o5phw2d7wt.com',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pkmgloiixwvhitqpcfyc.supabase.co',
        pathname: '/storage/**',
      },
    ],
  },
};

export default nextConfig;
