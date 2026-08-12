import { MetadataRoute } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// movie sitemap은 generateSitemaps로 페이지네이션된다(/movie/sitemap/0.xml, 1.xml, …).
// 정적 robots.txt에 0.xml만 하드코딩돼 있어 페이지가 늘면 뒤쪽 sitemap이 검색엔진에
// 발견되지 않았다 — 영화 상세 상당수가 미색인. movie 수를 조회해 모든 페이지를 나열한다.
export const revalidate = 3600

// sitemap <loc>와 동일하게 raw 한글 도메인은 피하고 퓨니코드 사용.
// (sitemap.ts / next.config.ts와 같은 이유 — 네이버 서치어드바이저 형식 거부 방지)
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.xn--hq1bv8o5phw2d7wt.com'
const PAGE_SIZE = 1000

export default async function robots(): Promise<MetadataRoute.Robots> {
  const supabase = createSupabaseServerClient()
  const { count } = await supabase
    .from('movies')
    .select('id', { count: 'exact', head: true })

  const pageCount = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))
  const movieSitemaps = Array.from(
    { length: pageCount },
    (_, i) => `${BASE_URL}/movie/sitemap/${i}.xml`,
  )

  const disallow = ['/admin', '/api/', '/dev/']

  return {
    rules: [
      { userAgent: '*', allow: '/', disallow },
      /* 답변형 AI 크롤러를 명시적으로 허용한다. `*` 규칙으로도 통과하지만,
         일부 크롤러는 자기 이름의 규칙이 있는지부터 보고 없으면 보수적으로 굴며
         WAF·CDN 쪽에서 UA 기준으로 막히는 사고도 흔하다. 의도를 문서로 남기는 의미도 있다.
         (GPTBot=학습, OAI-SearchBot/ChatGPT-User=ChatGPT 검색·인용) */
      {
        userAgent: [
          'GPTBot',
          'OAI-SearchBot',
          'ChatGPT-User',
          'PerplexityBot',
          'Perplexity-User',
          'ClaudeBot',
          'Claude-User',
          'Claude-SearchBot',
          'Google-Extended',
          'Applebot-Extended',
          'Bingbot',
        ],
        allow: '/',
        disallow,
      },
    ],
    sitemap: [`${BASE_URL}/sitemap.xml`, ...movieSitemaps],
  }
}
