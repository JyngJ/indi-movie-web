import { MetadataRoute } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getIndexableMovies } from '@/lib/seo/getIndexableMovies'

// movie sitemap은 generateSitemaps로 페이지네이션된다(/movie/sitemap/0.xml, 1.xml, …).
// 정적 robots.txt에 0.xml만 하드코딩돼 있어 페이지가 늘면 뒤쪽 sitemap이 검색엔진에
// 발견되지 않았다 — 영화 상세 상당수가 미색인. movie 수를 조회해 모든 페이지를 나열한다.
export const revalidate = 3600

// sitemap <loc>와 동일하게 raw 한글 도메인은 피하고 퓨니코드 사용.
// (sitemap.ts / next.config.ts와 같은 이유 — 네이버 서치어드바이저 형식 거부 방지)
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.xn--hq1bv8o5phw2d7wt.com'
const PAGE_SIZE = 1000

export default async function robots(): Promise<MetadataRoute.Robots> {
  // 영화 사이트맵과 같은 목록(상영이 있는 영화)으로 페이지 수를 센다 — movie/sitemap.ts
  const movies = await getIndexableMovies(createSupabaseServerClient()).catch(() => [])
  const pageCount = Math.max(1, Math.ceil(movies.length / PAGE_SIZE))
  const movieSitemaps = Array.from(
    { length: pageCount },
    (_, i) => `${BASE_URL}/movie/sitemap/${i}.xml`,
  )

  // /design-system은 내부 문서라 색인 대상이 아니다(각 페이지 metadata에도 noindex).
  const disallow = ['/admin', '/api/', '/dev/', '/design-system']

  return {
    rules: [
      { userAgent: '*', allow: '/', disallow },
      /* 답변형 AI 크롤러를 명시적으로 허용한다. `*` 규칙으로도 통과하지만,
         일부 크롤러는 자기 이름의 규칙이 있는지부터 보고 없으면 보수적으로 굴며
         WAF·CDN 쪽에서 UA 기준으로 막히는 사고도 흔하다. 의도를 문서로 남기는 의미도 있다.
         (OAI-SearchBot/ChatGPT-User=ChatGPT 검색·인용, Claude-SearchBot/Claude-User=Claude 검색·인용)
         Google-Extended·Applebot-Extended는 크롤러가 아니라 "학습에 써도 되나"를 묻는 표식이라
         여기 둬도 트래픽이 늘지 않는다. */
      {
        userAgent: [
          'OAI-SearchBot',
          'ChatGPT-User',
          'PerplexityBot',
          'Perplexity-User',
          'Claude-User',
          'Claude-SearchBot',
          'Google-Extended',
          'Applebot-Extended',
          'Bingbot',
        ],
        allow: '/',
        disallow,
      },
      /* 학습 전용 크롤러는 막는다(2026-09). 답변에 이 사이트를 인용하는 경로는 위 검색용 봇이
         따로 맡고, 이쪽은 사이트 전체를 훑어 가기만 한다. 영화·감독 상세가 수천 쪽이라 한 번
         훑을 때마다 캐시가 식은 페이지를 다시 그리게 되고, 그게 Vercel CPU로 나간다.
         robots.txt를 따르는 봇에만 통한다 — 무시하는 봇은 Vercel Firewall에서 막아야 한다. */
      {
        userAgent: ['GPTBot', 'ClaudeBot', 'CCBot', 'Bytespider', 'meta-externalagent'],
        disallow: '/',
      },
    ],
    sitemap: [`${BASE_URL}/sitemap.xml`, ...movieSitemaps],
  }
}
