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
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  // 구 라우트(/theater/[id]) → films 탭 라우트로 영구 리다이렉트.
  // sitemap도 신규 경로로만 생성하지만, 과거에 색인/공유된 구 링크를 위해 유지.
  async redirects() {
    return [
      { source: '/theater/:id', destination: '/films/theater/:id', permanent: true },
    ]
  },
};

export default nextConfig;
