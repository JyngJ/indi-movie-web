import { MetadataRoute } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getIndexableMovies, type IndexableMovie } from '@/lib/seo/getIndexableMovies'

// 24h였던 걸 1h로 단축 — /theater/[id]와 동일한 주기. 빌드 시점에 조회가 일시적으로
// 비정상이었을 때 그 결과가 하루 종일 박제되는 걸 막는다(throw 처리와 함께 동작).
export const revalidate = 3600

// sitemap <loc>에 퍼센트인코딩 안 된 raw 한글 도메인이 들어가면 스펙 위반이라
// 네이버 서치어드바이저가 "사이트맵/RSS 형식이 올바르지 않습니다"로 거부한다.
// next.config.ts의 VERCEL_PROJECT_PRODUCTION_URL 오버라이드와 동일한 이유로 퓨니코드 사용.
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.xn--hq1bv8o5phw2d7wt.com'
const PAGE_SIZE = 1000
const MAX_ATTEMPTS = 3

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/* 상영이 있는 영화만 싣는다(src/lib/seo/indexPolicy.ts). 2026-10 전까지는 movies 전체(1,897편)를
   실었는데 대부분이 상영 정보 없는 페이지라 애드센스 "가치가 별로 없는 콘텐츠" 거절의 원인이 됐다.
   robots.ts가 같은 목록으로 사이트맵 페이지 수를 센다. */
async function indexableWithRetry(): Promise<IndexableMovie[]> {
  let lastMessage = '원인 불명'
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await getIndexableMovies(createSupabaseServerClient())
    } catch (e) {
      lastMessage = e instanceof Error ? e.message : String(e)
      if (attempt < MAX_ATTEMPTS) await sleep(500 * attempt)
    }
  }
  // 조용히 빈 목록으로 넘어가면 빈 sitemap이 배포된다 — throw하면 ISR이 직전 정상 캐시를 계속 서빙한다.
  throw new Error(`movie sitemap: 조회 ${MAX_ATTEMPTS}회 재시도 후 실패 — ${lastMessage}`)
}

export async function generateSitemaps() {
  const movies = await indexableWithRetry()
  const pageCount = Math.max(1, Math.ceil(movies.length / PAGE_SIZE))
  return Array.from({ length: pageCount }, (_, i) => ({ id: i }))
}

export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  // Next.js 16부터 generateSitemaps의 id가 Promise<string>으로 전달된다 — await 안 하면 NaN이 된다.
  const id = Number(await props.id)
  const movies = await indexableWithRetry()
  return movies.slice(id * PAGE_SIZE, (id + 1) * PAGE_SIZE).map((m) => (
    { url: `${BASE_URL}/movie/${m.id}`, lastModified: new Date(m.updatedAt), changeFrequency: 'daily' as const, priority: 0.7 }
  ))
}
