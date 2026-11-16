import { unstable_cache } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { toKstIsoDate } from '@/lib/date'
import { resolveTheaterRegion } from '@/lib/regions'
import { countPastScreeningDays, summarizePastScreenings, type PastScreeningDay, type PastScreeningSummary } from './pastScreenings'

/**
 * 지난 상영 기록(screening_days) 조회. screening_days는 크롤이 지난 날짜를 영구 보관하는 표다
 * (2026-10-16, docs/SUPABASE_SCREENING_HISTORY.sql — showtimes는 30일만 남는다).
 *
 * 하루가 지나야 기록이 늘어나므로 6시간 캐시 + 날짜 키. 'screening-index' 태그는 크롤 뒤
 * /api/revalidate가 무효화한다.
 */
const TTL = 21600
const PAGE = 1000
/** 한 영화의 기록 상한 — 극장 × 날짜. 1년 내내 20곳에서 상영해도 7,300행이라 넉넉하다. */
const MAX_ROWS_PER_MOVIE = 10000

async function fetchMovieDays(supabase: SupabaseClient, movieId: string, today: string): Promise<PastScreeningDay[]> {
  const out: PastScreeningDay[] = []
  for (let offset = 0; offset < MAX_ROWS_PER_MOVIE; offset += PAGE) {
    const { data, error } = await supabase
      .from('screening_days')
      .select('theater_id, show_date, show_count, theaters(name, city, address)')
      .eq('movie_id', movieId)
      .lt('show_date', today)
      .order('show_date')
      .order('theater_id')
      .range(offset, offset + PAGE - 1)
    if (error) throw new Error(`getPastScreenings(${movieId}): ${error.message}`)
    for (const row of data ?? []) {
      const t = (Array.isArray(row.theaters) ? row.theaters[0] : row.theaters) as
        { name?: string | null; city?: string | null; address?: string | null } | null
      if (!t?.name) continue
      out.push({
        theaterId: String(row.theater_id),
        theaterName: t.name,
        region: resolveTheaterRegion(t.city, t.address),
        showDate: String(row.show_date),
        showCount: Number(row.show_count ?? 0),
      })
    }
    if (!data || data.length < PAGE) break
  }
  return out
}

const getCachedSummary = unstable_cache(
  async (movieId: string, today: string): Promise<PastScreeningSummary | null> =>
    summarizePastScreenings(await fetchMovieDays(createSupabaseServerClient(), movieId, today), today),
  ['catalog', 'past-screenings'],
  { revalidate: TTL, tags: ['screening-index'] },
)

/** 영화 한 편의 지난 상영 요약. 기록이 없으면 null */
export function getPastScreenings(movieId: string): Promise<PastScreeningSummary | null> {
  return getCachedSummary(movieId, toKstIsoDate(new Date()))
}

/**
 * 영화별 지난 상영 날 수 — 사이트맵(getReopenedMovies)이 색인 기준을 영화 전체에 적용할 때 쓴다.
 * 2026-11 기준 약 1만 2천 행(한 달치)이라 movie_id·show_date만 읽어 센다. 기록이 몇 해 쌓여
 * 페이지 수가 부담되면 movie_id별로 미리 센 뷰로 바꾼다.
 */
const getCachedDayCounts = unstable_cache(
  async (today: string): Promise<[string, number][]> => {
    const supabase = createSupabaseServerClient()
    const rows: { movieId: string; showDate: string }[] = []
    for (let offset = 0; ; offset += PAGE) {
      const { data, error } = await supabase
        .from('screening_days')
        .select('movie_id, show_date')
        .lt('show_date', today)
        .order('movie_id')
        .order('theater_id')
        .order('show_date')
        .range(offset, offset + PAGE - 1)
      if (error) throw new Error(`getPastScreeningDayCounts: ${error.message}`)
      for (const r of data ?? []) rows.push({ movieId: String(r.movie_id), showDate: String(r.show_date) })
      if (!data || data.length < PAGE) break
    }
    return [...countPastScreeningDays(rows, today).entries()]
  },
  ['catalog', 'past-screening-day-counts'],
  { revalidate: TTL, tags: ['screening-index'] },
)

export async function getPastScreeningDayCounts(): Promise<Map<string, number>> {
  return new Map(await getCachedDayCounts(toKstIsoDate(new Date())))
}
