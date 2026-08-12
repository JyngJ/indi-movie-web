import { unstable_cache } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { toKstIsoDate } from '@/lib/date'
import { getMovieTheaterShowtimes, type MovieTheaterEntry } from './getMovieTheaterShowtimes'

/**
 * SSR 초기 페이로드용 상영시간표 — 캐시된 서버 전용 래퍼.
 *
 * `/movie/[id]`는 동적 렌더라 방문(=봇 크롤 포함)마다 showtimes⋈theaters 조인을
 * 새로 쳤다. 행이 최대 1000개라 movies 조회보다 훨씬 무겁다(egress 대부분이 여기서
 * 나온다). 클라이언트는 어차피 `/api/public/movie/[id]/theaters`로 최신 회차를
 * 다시 받아오므로, 서버가 심는 초기 데이터는 몇 분 지연돼도 무해하다.
 *
 * 실시간성이 필요한 API 라우트는 이 래퍼를 쓰지 않는다 — 좌석 수가 늦게 반영된다.
 */
const TTL = 600

const getCached = unstable_cache(
  async (movieId: string, _dateKey: string): Promise<MovieTheaterEntry[]> => {
    return getMovieTheaterShowtimes(createSupabaseServerClient(), movieId)
  },
  ['catalog', 'movie-showtimes-ssr'],
  { revalidate: TTL, tags: ['movie-showtimes'] },
)

/**
 * 날짜(KST)를 캐시 키에 넣는다 — 조회 구간이 "오늘부터 13일"이라 자정을 넘기면
 * 구간 자체가 밀린다. 안 넣으면 TTL이 남은 동안 어제 구간이 그대로 나온다.
 */
export function getMovieShowtimesForSsr(movieId: string): Promise<MovieTheaterEntry[]> {
  return getCached(movieId, toKstIsoDate(new Date()))
}
