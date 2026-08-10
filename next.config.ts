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
    // ★ 임시 (2026-08-09): Image Transformations 무료 쿼터 5,000/월 100% 소진 —
    // 옵티마이저가 402를 반환해 프로덕션 포스터가 전부 깨짐. 원본 직접 서빙으로 전환.
    // 외부 호스트(KMDB 등)가 직접 서빙하므로 Vercel 대역폭 부담도 없음.
    // 청구주기 리셋 후 이 줄만 제거하는 되돌림 PR 필요 — 아래 잠금·캐시 설정은 유지.
    unoptimized: true,
    // 전체 개방('**')이면 /_next/image?url=<아무 URL>로 외부인이 변환 쿼터를 소진할 수
    // 있는 열린 프록시가 됨 (2026-08-08 쿼터 4.9k/5k 조사에서 잠금 결정).
    // 목록은 DB 실측 포스터/배너 호스트 — 새 호스트의 포스터가 안 뜨면 여기 추가.
    // DB 전수 스캔 결과(movies.poster_url·directors.photo_url·instagram card·festivals.banner_url).
    // 새 호스트 포스터가 안 뜨면: npm run check:image-hosts 로 누락 확인 후 여기 추가.
    remotePatterns: [
      { protocol: 'https', hostname: 'file.koreafilm.or.kr' },   // KMDB 포스터 (대부분)
      { protocol: 'http', hostname: 'file.koreafilm.or.kr' },    // 구 데이터에 http 포스터 존재
      { protocol: 'https', hostname: '*.supabase.co' },          // 어드민 업로드 스토리지
      { protocol: 'https', hostname: 'cdn.imweb.me' },           // 영화제 배너
      { protocol: 'https', hostname: 'image.cine21.com' },
      { protocol: 'https', hostname: '*.wikimedia.org' },
      { protocol: 'https', hostname: '*.naver.net' },            // imgnews·shopping.phinf
      { protocol: 'https', hostname: '*.daumcdn.net' },
      { protocol: 'https', hostname: 'images.justwatch.com' },
      { protocol: 'https', hostname: 'i.namu.wiki' },
      { protocol: 'https', hostname: 'image.aladin.co.kr' },
      { protocol: 'https', hostname: 'i.pinimg.com' },
      { protocol: 'https', hostname: 'cdn.mania.kr' },
      { protocol: 'https', hostname: 'image.yes24.com' },
      { protocol: 'https', hostname: 'img.extmovie.com' },
      { protocol: 'https', hostname: 'img.theqoo.net' },
      { protocol: 'https', hostname: 'artinsight.co.kr' },
      { protocol: 'https', hostname: 'www.saeronam.or.kr' },
      { protocol: 'https', hostname: 'img.hankyung.com' },
      { protocol: 'https', hostname: 'www.ktv.go.kr' },
      { protocol: 'https', hostname: 'image.daisomall.co.kr' },
      { protocol: 'https', hostname: 'm.media-amazon.com' },
      { protocol: 'https', hostname: 'an2-img.amz.wtchn.net' },
      { protocol: 'https', hostname: 'live-production.wcms.abc-cdn.net.au' },
      { protocol: 'https', hostname: 'cdn.spooncast.net' },
      { protocol: 'https', hostname: 'timg.humoruniv.com' },
      { protocol: 'https', hostname: 'dhgywazgeek0d.cloudfront.net' },
      { protocol: 'https', hostname: 'cdn.eyesmag.com' },
      { protocol: 'https', hostname: 'encrypted-tbn2.gstatic.com' },
      { protocol: 'https', hostname: 'flexible.img.hani.co.kr' },
      { protocol: 'https', hostname: 'cdn.instiz.net' },
      { protocol: 'https', hostname: 'dcimg1.dcinside.com' },
      { protocol: 'https', hostname: 'image.ytn.co.kr' },
      { protocol: 'https', hostname: 'image.fnnews.com' },
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
  // 구 라우트 → 신규 라우트 영구 리다이렉트.
  // sitemap은 신규 경로로만 생성하지만, 과거에 색인/공유된 구 링크를 위해 유지.
  // - /theater/[id] → films 탭 상세
  // - /films(정확히 그 경로만) → '/' : 상영작이 홈으로 승격되면서 탭 루트가 옮겨졌다.
  //   /films/movie, /films/theater, /films/director, /films/area 하위는 그대로 유지되므로
  //   와일드카드 없이 정확 일치만 리다이렉트한다.
  async redirects() {
    return [
      { source: '/theater/:id', destination: '/films/theater/:id', permanent: true },
      { source: '/films', destination: '/', permanent: true },
    ]
  },
};

export default nextConfig;
