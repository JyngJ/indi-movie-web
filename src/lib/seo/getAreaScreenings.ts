import { unstable_cache } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { toKstIsoDate } from '@/lib/date'
import { getScreeningIndex } from './getScreeningIndex'

/**
 * 지역 페이지의 검색엔진·LLM용 회차 데이터 (SSR 전용).
 *
 * `/films/area/[region]`은 극장 이름과 상영작 제목만 서버 HTML에 있고 정작 회차 시각이
 * 없었다 — 타이틀이 "상영시간표"라고 약속하는데 본문에 시간이 한 개도 없는 상태였다.
 * getScreeningIndex는 showtimes에서 movie_id·theater_id만 뽑아 "어디서 무엇을"까지만
 * 답할 수 있다. 지역 통합 쿼리("서울 독립영화관")는 극장 하나짜리 공식 홈페이지가
 * 답할 수 없는 자리라 우리가 이길 수 있는 전장인데, 정작 그 페이지가 제일 얇았다.
 *
 * 전국 인덱스에 show_time을 얹지 않고 따로 조회하는 이유: getScreeningIndex는
 * `.gte('show_date', today)`로 미래 상영 전체를 상한 없이 긁는다. 거기에 회차 시각까지
 * 더하면 페이로드가 지역 페이지 하나 때문에 전국 규모로 커진다. 지역 페이지가 필요한
 * 건 오늘 하루뿐이므로 오늘치만 지역 단위로 조회한다.
 *
 * Clean Architecture: 순수 조회만 담당하고 UI를 모른다.
 */

export interface AreaScreeningMovie {
  movieId: string
  title: string
  year: number | null
  /** 'HH:MM' — 같은 극장에서 같은 영화의 회차들 */
  times: string[]
}

export interface AreaScreeningTheater {
  theaterId: string
  name: string
  address: string
  movies: AreaScreeningMovie[]
}

export interface AreaScreenings {
  /** KST 기준 조회일 (YYYY-MM-DD) */
  date: string
  /** 오늘 상영이 있는 극장만. 극장 이름 순 */
  theaters: AreaScreeningTheater[]
  /** 오늘 이 지역의 총 회차 수 */
  showtimeCount: number
  /** 오늘 이 지역에서 상영하는 서로 다른 영화 수 */
  movieCount: number
}

/** 6시간 — 크롤러가 읽을 텍스트라 지연 무해. getTheaterScreenings와 같은 주기. */
const TTL = 21600

/** 지역 하나의 하루치 상한. 서울이 가장 크고 그래도 여유가 크다. */
const MAX_ROWS = 800

const EMPTY = (date: string): AreaScreenings => ({
  date,
  theaters: [],
  showtimeCount: 0,
  movieCount: 0,
})

const getAreaScreeningsFor = unstable_cache(
  async (regionId: string, today: string): Promise<AreaScreenings> => {
    // 전국 인덱스는 이미 캐시돼 있어 여기서 DB를 다시 치지 않는다.
    const index = await getScreeningIndex(regionId)
    if (index.theaters.length === 0) return EMPTY(today)

    const theaterById = new Map(index.theaters.map((t) => [t.id, t]))

    const supabase = createSupabaseServerClient()
    const { data, error } = await supabase
      .from('showtimes')
      .select('theater_id,movie_id,show_time,movies(id,title,year)')
      .in('theater_id', [...theaterById.keys()])
      .eq('is_active', true)
      .eq('show_date', today)
      .order('show_time')
      .limit(MAX_ROWS)

    // 조용히 빈 결과를 내면 "오늘 상영이 없다"로 읽혀 크롤러에 빈 페이지가 박힌다.
    // 지역 페이지 자체는 극장 목록으로 살아 있어야 하므로 throw 대신 빈 회차를 돌려주되
    // 원인을 남긴다. (극장 0곳이면 페이지가 notFound()로 이미 걸러진다)
    if (error) {
      console.warn(`[area-screenings] ${regionId} 회차 조회 실패: ${error.message}`)
      return EMPTY(today)
    }

    const byTheater = new Map<string, Map<string, AreaScreeningMovie>>()
    const movieIds = new Set<string>()
    let showtimeCount = 0

    for (const row of data ?? []) {
      const movie = row.movies as unknown as {
        id?: string; title?: string; year?: number | null
      } | null
      const theaterId = row.theater_id != null ? String(row.theater_id) : ''
      if (!movie?.id || !movie.title || !theaterById.has(theaterId)) continue

      const movieId = String(movie.id)
      movieIds.add(movieId)
      showtimeCount += 1

      if (!byTheater.has(theaterId)) byTheater.set(theaterId, new Map())
      const slots = byTheater.get(theaterId)!

      if (!slots.has(movieId)) {
        slots.set(movieId, {
          movieId,
          title: String(movie.title),
          year: movie.year === null || movie.year === undefined ? null : Number(movie.year),
          times: [],
        })
      }
      // 'HH:MM:SS' → 'HH:MM'
      slots.get(movieId)!.times.push(String(row.show_time).slice(0, 5))
    }

    const theaters: AreaScreeningTheater[] = [...byTheater.entries()]
      .map(([theaterId, slots]) => {
        const theater = theaterById.get(theaterId)!
        return {
          theaterId,
          name: theater.name,
          address: theater.address,
          movies: [...slots.values()],
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'))

    return { date: today, theaters, showtimeCount, movieCount: movieIds.size }
  },
  ['seo', 'area-screenings'],
  { revalidate: TTL, tags: ['area-screenings'] },
)

/** 지역의 오늘치 극장별 상영 회차 */
export function getAreaScreenings(regionId: string): Promise<AreaScreenings> {
  return getAreaScreeningsFor(regionId, toKstIsoDate(new Date()))
}
