import { unstable_cache } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { toKstIsoDate } from '@/lib/date'

/**
 * 극장 페이지의 검색엔진·LLM용 본문 데이터 (SSR 전용).
 *
 * `/films/theater/[id]`는 극장 이름·주소만 서버 HTML에 있고 정작 핵심인 시간표는
 * 클라이언트에서 채워진다 — 서버 HTML 160자. "OO극장 오늘 뭐 해요?"에 답할 본문이 없다.
 * 메타 description용 `getTheaterTodayMovieTitles`(제목 3개)로는 본문을 채우기 부족해
 * 날짜별 상영작·시간을 따로 조회한다.
 *
 * Clean Architecture: 순수 조회만 담당하고 UI를 모른다.
 */

export interface TheaterScreeningSlot {
  movieId: string
  movieTitle: string
  year: number | null
  director: string[]
  /** 'HH:MM' — 같은 영화의 회차들 */
  times: string[]
}

export interface TheaterScreeningDay {
  /** YYYY-MM-DD */
  date: string
  movies: TheaterScreeningSlot[]
}

export interface TheaterScreenings {
  /** KST 기준 조회일 */
  date: string
  days: TheaterScreeningDay[]
  /** 조회 범위 안에 상영이 잡힌 서로 다른 영화 수 */
  movieCount: number
}

/** 극장 시트 날짜바와 같은 2주 */
const WINDOW_DAYS = 14

/** 6시간 — 크롤러가 읽을 텍스트라 지연 무해. 극장 157개 × 재생성마다 조회를 줄인다. */
const TTL = 21600

const getTheaterScreeningsFor = unstable_cache(
  async (theaterId: string, today: string): Promise<TheaterScreenings> => {
    const supabase = createSupabaseServerClient()

    const end = new Date(`${today}T00:00:00+09:00`)
    end.setDate(end.getDate() + WINDOW_DAYS - 1)
    const endDate = toKstIsoDate(end)

    const { data } = await supabase
      .from('showtimes')
      .select('movie_id,show_date,show_time,movies(id,title,year,director)')
      .eq('theater_id', theaterId)
      .eq('is_active', true)
      .gte('show_date', today)
      .lte('show_date', endDate)
      .order('show_date')
      .order('show_time')
      .limit(600)

    const byDate = new Map<string, Map<string, TheaterScreeningSlot>>()
    const movieIds = new Set<string>()

    for (const row of data ?? []) {
      const movie = row.movies as unknown as {
        id?: string; title?: string; year?: number | null; director?: string[] | null
      } | null
      if (!movie?.id || !movie.title) continue

      const date = String(row.show_date)
      const movieId = String(movie.id)
      movieIds.add(movieId)

      if (!byDate.has(date)) byDate.set(date, new Map())
      const slots = byDate.get(date)!

      if (!slots.has(movieId)) {
        slots.set(movieId, {
          movieId,
          movieTitle: String(movie.title),
          year: movie.year === null || movie.year === undefined ? null : Number(movie.year),
          director: movie.director ?? [],
          times: [],
        })
      }
      // 'HH:MM:SS' → 'HH:MM'
      slots.get(movieId)!.times.push(String(row.show_time).slice(0, 5))
    }

    const days: TheaterScreeningDay[] = [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, slots]) => ({ date, movies: [...slots.values()] }))

    return { date: today, days, movieCount: movieIds.size }
  },
  ['seo', 'theater-screenings'],
  { revalidate: TTL, tags: ['theater-screenings'] },
)

/** 오늘부터 2주간의 날짜별 상영작·회차 */
export function getTheaterScreenings(theaterId: string): Promise<TheaterScreenings> {
  return getTheaterScreeningsFor(theaterId, toKstIsoDate(new Date()))
}
