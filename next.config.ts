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
    // 포스터는 한번 정해지면 사실상 안 바뀌는 콘텐츠 — 기본 캐시 수명이 짧아
    // 배포마다/짧은 주기로 같은 이미지가 재변환되며 Image Optimization 사용량이
    // 불필요하게 쌓이는 걸 방지 (30일)
    minimumCacheTTL: 2592000,
    // 앱에서 실제 쓰는 포스터/배너 폭으로 버킷을 좁혀 변환 조합 수를 줄임.
    // (68~220px 각지 고정폭 포스터, 480/662px 배너, 100vw 모바일 배너)
    imageSizes: [80, 100, 120, 140, 220],
    deviceSizes: [480, 640, 750, 1080],
  },
  // 스트리밍 메타데이터 비활성(전 UA 차단 목록 처리) — 동적 상세에서 메타 link를
  // body→head로 옮기는 인라인 스크립트가 hydration과 경합해 페이지가 영영 hydrate되지
  // 않는 스톨(직진입 무한 로딩)을 일으켜서, 메타데이터를 블로킹으로 강제한다.
  htmlLimitedBots: /.*/,
  // 구 라우트(/theater/[id]) → films 탭 라우트로 영구 리다이렉트.
  // sitemap도 신규 경로로만 생성하지만, 과거에 색인/공유된 구 링크를 위해 유지.
  async redirects() {
    return [
      { source: '/theater/:id', destination: '/films/theater/:id', permanent: true },
    ]
  },
};

export default nextConfig;
