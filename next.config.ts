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
      // /about → /faq : 소개 페이지를 따로 두지 않고 FAQ가 그 역할을 겸한다.
      // 외부에서 관성적으로 /about을 치고 들어오는 트래픽을 받아준다.
      { source: '/about', destination: '/faq', permanent: true },
      // 지도 딥링크 구제 — '/'가 상영작이 되기 전에 공유된 링크는 '/?theater=…&movie=…' 꼴이다.
      // 지도 파라미터를 읽는 MapView는 '/map'에서만 마운트되므로 루트로 오면 통째로 무시된다.
      // 쿼리스트링은 Next가 목적지로 그대로 넘겨준다. 영구가 아닌 이유는 루트의 의미가
      // 또 바뀔 수 있어서다(진입점은 실험으로 정해진다).
      ...(['theater', 'movie', 'director'] as const).map((key) => ({
        source: '/',
        has: [{ type: 'query' as const, key }],
        destination: '/map',
        permanent: false,
      })),
    ]
  },
  // 동적 상세 페이지의 HTML을 CDN에 캐시한다.
  //
  // 이 페이지들은 hydration 스톨·한글 헤더 500을 피하려고 force-dynamic으로 두는데,
  // Next가 동적 라우트에 `no-store`를 박아서 방문 한 번이 함수 실행 한 번이 된다.
  // 2026-09 Fluid Active CPU가 무료 한도(4시간/월)를 넘긴 주된 이유다.
  //
  // 세 페이지 모두 서버에서 쿠키·세션·유저 상태를 읽지 않아 응답 HTML이 전 사용자
  // 동일하다 — 그래서 공개 캐시에 올려도 안전하다. 잔여석·회차 같은 변하는 값은
  // 클라이언트가 /api/public/*로 따로 가져오므로 HTML 캐시 수명과 무관하다.
  //
  // force-dynamic은 그대로 둔다. 목적이 "정적 셸을 만들지 않는 것"이지
  // "캐시하지 않는 것"이 아니기 때문이다.
  async headers() {
    // 상영 시간표는 크롤러가 하루 세 번(01·07·13시) 갱신하므로 5분 캐시로도
    // 체감 신선도가 떨어지지 않는다. stale-while-revalidate로 만료 직후 요청도
    // 함수를 기다리지 않고 캐시를 받는다.
    const detail = 'public, s-maxage=300, stale-while-revalidate=3600'
    // 지역 페이지는 극장 목록이 본문이라 훨씬 느리게 변한다.
    const area = 'public, s-maxage=1800, stale-while-revalidate=86400'
    return [
      // 대표 영화 상세 — 검색 유입이 전부 여기로 온다(2026-09 라우트 통합, #356).
      // 통합 때 이 항목이 같이 오지 않아, 정작 가장 많이 열리는 페이지만 캐시 없이
      // 매 방문 함수를 돌리고 있었다.
      { source: '/movie/:id', headers: [{ key: 'Cache-Control', value: detail }] },
      // 회차 공유 링크 — 본 상세와 같은 주기로 캐시한다(회차 id별로 따로 굳는다).
      { source: '/movie/:id/s/:showtimeId', headers: [{ key: 'Cache-Control', value: detail }] },
      // 구 경로는 이제 308만 던진다 — 리다이렉트 응답도 캐시해 링크당 함수 실행을 막는다.
      { source: '/films/movie/:id', headers: [{ key: 'Cache-Control', value: detail }] },
      { source: '/films/theater/:id', headers: [{ key: 'Cache-Control', value: detail }] },
      { source: '/films/theater/:id/s/:showtimeId', headers: [{ key: 'Cache-Control', value: detail }] },
      { source: '/films/area/:region', headers: [{ key: 'Cache-Control', value: area }] },
    ]
  },
};


export default nextConfig;
