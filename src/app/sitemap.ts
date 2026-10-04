import { MetadataRoute } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getRegionFromCity, REGIONS } from '@/lib/regions'
import { festivalViewPath, listFestivalViews } from '@/lib/festival/festivalView'

// 24h였던 걸 1h로 단축 — /theater/[id]와 동일한 주기. 빌드 시점에 조회가 일시적으로
// 비정상이었을 때 그 결과가 하루 종일 박제되는 걸 막는다(throw 처리와 함께 동작).
export const revalidate = 3600

// sitemap <loc>에 퍼센트인코딩 안 된 raw 한글 도메인이 들어가면 스펙 위반이라
// 네이버 서치어드바이저가 "사이트맵/RSS 형식이 올바르지 않습니다"로 거부한다.
// next.config.ts의 VERCEL_PROJECT_PRODUCTION_URL 오버라이드와 동일한 이유로 퓨니코드 사용.
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.xn--hq1bv8o5phw2d7wt.com'
const MAX_ATTEMPTS = 3

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// 빌드 시점에 에러 없이 빈 배열만 오는 경우가 실제로 관측됨(원인 미상, 재현됨) —
// 정상 에러뿐 아니라 "이유 없는 빈 결과"도 재시도 대상으로 취급한다.
// requireNonEmpty=false인 쿼리(festivals 등)는 정상적으로 0건일 수 있어 에러만 재시도한다.
async function fetchWithRetry<T>(
  label: string,
  run: () => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  requireNonEmpty: boolean,
): Promise<T[]> {
  let lastMessage = '원인 불명'
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { data, error } = await run()
    if (!error && data && (!requireNonEmpty || data.length > 0)) return data
    lastMessage = error?.message ?? '에러 없이 빈 배열 반환'
    if (attempt < MAX_ATTEMPTS) await sleep(500 * attempt)
  }
  // 조용히 빈 배열을 반환하면 검색엔진에 빈 sitemap이 그대로 배포된다 — throw하면
  // Next ISR이 재생성 실패 시 직전 정상 캐시를 계속 서빙한다(stale-on-error).
  throw new Error(`sitemap(${label}): 조회 ${MAX_ATTEMPTS}회 재시도 후 실패 — ${lastMessage}`)
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createSupabaseServerClient()

  const [theaters, directors, festivals] = await Promise.all([
    fetchWithRetry<{ id: string; updated_at: string; city: string | null }>('theaters', () => supabase.from('theaters').select('id, updated_at, city'), true),
    fetchWithRetry<{ director: string[] | null }>('movies.director', () => supabase.from('movies').select('director'), true),
    // is_active 필터 필수 — 비활성 영화제가 sitemap에 실리면 상세가 notFound()라
    // Search Console에 404가 쌓인다(죽은 극장 sitemap 이슈와 같은 재발 패턴).
    // 활성 영화제가 0개인 건 정상 상태라 빈 결과를 재시도 대상으로 삼지 않는다.
    fetchWithRetry<{ id: string; slug: string; updated_at: string }>('festivals', () => supabase.from('festivals').select('id, slug, updated_at').eq('is_active', true), false),
  ])

  const theaterUrls: MetadataRoute.Sitemap = theaters.map((t) => (
    { url: `${BASE_URL}/films/theater/${t.id}`, lastModified: new Date(t.updated_at), changeFrequency: 'weekly' as const, priority: 0.8 }
  ))

  const directorNames = [...new Set(
    directors.flatMap((m) => (m.director as string[] | null) ?? []).filter(Boolean)
  )]
  const directorUrls: MetadataRoute.Sitemap = directorNames.map((name) => ({
    url: `${BASE_URL}/films/director/${encodeURIComponent(name)}`,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  const festivalUrls: MetadataRoute.Sitemap = festivals.map((f) => (
    { url: `${BASE_URL}/festival/${f.slug}`, lastModified: new Date(f.updated_at), changeFrequency: 'weekly' as const, priority: 0.7 }
  ))

  // 영화제 하위 페이지(날짜별 시간표 · GV 일정) — 회차가 있는 날짜만(없는 날짜는 notFound라 404가 쌓인다).
  // 회차 조회가 실패해도 sitemap 전체를 버리지 않고 하위 페이지만 뺀다 — 회차 테이블은 영화제 본 행보다 나중에 생겼다
  const festivalViewUrls: MetadataRoute.Sitemap = []
  if (festivals.length > 0) {
    const { data: screeningKeys } = await supabase
      .from('festival_screenings')
      .select('festival_id, screening_date, has_gv')
      .in('festival_id', festivals.map((f) => f.id))
    for (const f of festivals) {
      const keys = (screeningKeys ?? [])
        .filter((r) => r.festival_id === f.id)
        .map((r) => ({ screeningDate: r.screening_date as string, hasGv: Boolean(r.has_gv) }))
      for (const view of listFestivalViews(keys)) {
        festivalViewUrls.push({ url: `${BASE_URL}${festivalViewPath(f.slug, view)}`, lastModified: new Date(f.updated_at), changeFrequency: 'daily', priority: 0.6 })
      }
    }
  }

  // 극장이 실제 존재하는 지역만 — 빈 지역 페이지는 notFound()라 sitemap에 실으면 404가 쌓인다
  const regionsWithTheaters = new Set(theaters.map((t) => getRegionFromCity(t.city ?? '')))
  const areaUrls: MetadataRoute.Sitemap = REGIONS
    .filter((r) => regionsWithTheaters.has(r.id))
    .map((r) => ({
      url: `${BASE_URL}/films/area/${encodeURIComponent(r.id)}`,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    }))

  return [
    { url: BASE_URL, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/map`, changeFrequency: 'daily', priority: 0.6 },
    { url: `${BASE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE_URL}/faq`, changeFrequency: 'monthly', priority: 0.5 },
    ...areaUrls,
    ...theaterUrls,
    ...directorUrls,
    ...festivalUrls,
    ...festivalViewUrls,
  ]
}
