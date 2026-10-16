import { unstable_cache } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { toKstIsoDate } from '@/lib/date'
import { getSimilarityPool } from '@/lib/catalog/getSimilarityPool'
import { pickSimilarNowShowing } from '@/lib/catalog/similarNowShowing'
import { shouldIndexMovie } from './indexPolicy'
import type { IndexableMovie } from './getIndexableMovies'

const PAGE = 1000

/**
 * 상영은 없지만 다시 색인하는 영화(indexPolicy.shouldIndexMovie) — 영화 사이트맵과 robots.txt의
 * 사이트맵 페이지 수가 같은 목록을 쓴다. 감독 사이트맵에는 넣지 않는다(감독 페이지는 그대로 닫아 둔다).
 * 영화 전체(약 1,900편)의 시놉시스를 읽으므로 6시간 캐시. 날짜를 키에 넣어 자정을 넘기면 새로 계산한다.
 * 조회 실패는 throw — 빈 목록이면 사이트맵에서 통째로 빠진다.
 */
const compute = unstable_cache(
  async (_today: string, upcomingIds: string[]): Promise<IndexableMovie[]> => {
    const upcoming = new Set(upcomingIds)
    const pool = await getSimilarityPool()
    const supabase = createSupabaseServerClient()
    const out: IndexableMovie[] = []
    for (let offset = 0; ; offset += PAGE) {
      const { data, error } = await supabase
        .from('movies')
        .select('id, updated_at, year, director, nation, genre, movie_details(synopsis)')
        .order('id')
        .range(offset, offset + PAGE - 1)
      if (error) throw new Error(`getReopenedMovies: ${error.message}`)
      for (const row of data ?? []) {
        const id = String(row.id)
        if (upcoming.has(id)) continue
        const details = (Array.isArray(row.movie_details) ? row.movie_details[0] : row.movie_details) as { synopsis?: string | null } | null
        const director = (row.director as string[] | null) ?? []
        const similar = pickSimilarNowShowing({
          id,
          director,
          genre: (row.genre as string[] | null) ?? [],
          nation: (row.nation as string | null) ?? null,
          year: row.year != null ? Number(row.year) : null,
        }, pool)
        if (shouldIndexMovie({
          hasUpcoming: false,
          synopsisLength: details?.synopsis?.trim().length ?? 0,
          sameDirectorNowShowing: similar.filter((m) => m.reason.kind === 'director').length,
        })) {
          out.push({ id, updatedAt: String(row.updated_at), director })
        }
      }
      if (!data || data.length < PAGE) break
    }
    return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  },
  ['seo', 'reopened-movies', 'same-director'],
  { revalidate: 21600, tags: ['screening-index'] },
)

export function getReopenedMovies(upcoming: readonly IndexableMovie[]): Promise<IndexableMovie[]> {
  return compute(toKstIsoDate(new Date()), upcoming.map((m) => m.id).sort())
}
