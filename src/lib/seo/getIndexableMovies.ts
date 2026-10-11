import type { SupabaseClient } from '@supabase/supabase-js'
import { addDaysIso, toKstIsoDate } from '@/lib/date'
import { INDEX_WINDOW_DAYS } from './indexPolicy'

export interface IndexableMovie {
  id: string
  updatedAt: string
  director: string[]
}

const PAGE = 1000

/**
 * 색인 대상 영화 — 오늘(KST)부터 INDEX_WINDOW_DAYS 안에 활성 상영이 있는 영화.
 * 영화 사이트맵·robots.txt·감독 사이트맵이 같은 목록을 쓴다(셋이 어긋나면 사이트맵 페이지 수가 틀어진다).
 * 조회 실패는 throw — 빈 목록을 돌려주면 빈 사이트맵이 배포된다(sitemap 재생성 실패 시 직전 캐시 유지).
 */
export async function getIndexableMovies(supabase: SupabaseClient): Promise<IndexableMovie[]> {
  const from = toKstIsoDate(new Date())
  const until = addDaysIso(from, INDEX_WINDOW_DAYS - 1)

  const movieIds = new Set<string>()
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from('showtimes')
      .select('movie_id')
      .eq('is_active', true)
      .not('movie_id', 'is', null)
      .gte('show_date', from)
      .lte('show_date', until)
      .order('id')
      .range(offset, offset + PAGE - 1)
    if (error) throw new Error(`getIndexableMovies(showtimes): ${error.message}`)
    for (const row of data ?? []) movieIds.add(row.movie_id as string)
    if (!data || data.length < PAGE) break
  }

  const ids = [...movieIds]
  const movies: IndexableMovie[] = []
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase
      .from('movies')
      .select('id, updated_at, director')
      .in('id', ids.slice(i, i + 200))
    if (error) throw new Error(`getIndexableMovies(movies): ${error.message}`)
    for (const m of data ?? []) {
      movies.push({ id: m.id, updatedAt: m.updated_at, director: (m.director as string[] | null) ?? [] })
    }
  }
  return movies.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}
