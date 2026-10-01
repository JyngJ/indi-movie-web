import { unstable_cache } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { toKstIsoDate } from '@/lib/date'
import {
  fetchTheaterDayShowtimes,
  fetchTheaterMovieEntries,
  type TheaterDayShowtimes,
  type TheaterMovieEntryRow,
} from './theaterShowtimes'

/**
 * 극장 상세 SSR이 클라이언트 캐시에 심는 첫 화면 데이터 (서버 전용).
 *
 * 예전엔 서버가 페이지를 그린 뒤 브라우저가 `/api/public/theater/[id]/movies`와
 * `/showtimes`를 다시 불렀다 — 방문 한 번에 함수 3번. JS를 실행하는 검색 봇도 같다.
 * 오늘 날짜의 두 응답을 여기서 미리 만들어 넘기면 첫 화면은 함수 1번으로 끝난다.
 * 다른 날짜를 누르면 그때 API를 부른다.
 */

/** 클라이언트 useTheaterAllMovies와 같은 2주 — 키가 같아야 심은 값이 쓰인다 */
export const THEATER_INITIAL_WINDOW_DAYS = 14

/** 10분 — 영화 상세 SSR 래퍼(getMovieShowtimesCached)와 같은 값 */
const TTL = 600

export interface TheaterInitialShowtimes {
  /** KST 오늘 (YYYY-MM-DD) */
  date: string
  /** movies 조회 범위 끝 (YYYY-MM-DD) */
  endDate: string
  /** DB에서 읽은 시각(ms) — 클라이언트가 이 값으로 다시 받을지 정한다 */
  fetchedAt: number
  movies: TheaterMovieEntryRow[]
  day: TheaterDayShowtimes
}

const getCached = unstable_cache(
  async (theaterId: string, today: string): Promise<TheaterInitialShowtimes> => {
    const supabase = createSupabaseServerClient()
    const end = new Date(`${today}T00:00:00+09:00`)
    end.setDate(end.getDate() + THEATER_INITIAL_WINDOW_DAYS - 1)
    const endDate = toKstIsoDate(end)

    const [movies, day] = await Promise.all([
      fetchTheaterMovieEntries(supabase, theaterId, today, endDate),
      fetchTheaterDayShowtimes(supabase, theaterId, today),
    ])
    return { date: today, endDate, fetchedAt: Date.now(), movies, day }
  },
  ['catalog', 'theater-initial-showtimes'],
  { revalidate: TTL, tags: ['theater-screenings'] },
)

/** 실패하면 null — 첫 화면 데이터는 덤이라 페이지를 깨뜨리지 않고 클라이언트 조회로 넘긴다 */
export async function getTheaterInitialShowtimes(theaterId: string): Promise<TheaterInitialShowtimes | null> {
  try {
    return await getCached(theaterId, toKstIsoDate(new Date()))
  } catch {
    return null
  }
}
