import { unstable_cache } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export interface ShowtimeLocation {
  id: string
  date: string
  time: string
  theaterId: string
  movieId: string
  movieTitle: string
}

/**
 * 회차 id 하나로 날짜·극장·영화를 찾는다 — 회차 공유 링크(`.../s/[showtimeId]`) 전용.
 *
 * 공유 링크가 `?date=&theater=&showtime=`이던 시절엔 서버가 쿼리를 읽어야 했고,
 * 그 때문에 상세 페이지 전체가 매 요청 동적으로 굳었다(Vercel Fluid Active CPU 초과의
 * 원인). 경로에 회차 id만 싣고 나머지는 여기서 찾으면 페이지가 캐시된 채로 남는다.
 *
 * 한 건 조회라 가볍지만, 봇이 공유 링크를 반복해서 긁는 경우가 있어 캐시를 둔다.
 */
const TTL = 600

const getCached = unstable_cache(
  async (showtimeId: string): Promise<ShowtimeLocation | null> => {
    const supabase = createSupabaseServerClient()
    const { data, error } = await supabase
      .from('showtimes')
      .select('id, show_date, show_time, theater_id, movie_id, movies(title)')
      .eq('id', showtimeId)
      .maybeSingle()

    if (error || !data) return null
    const movie = data.movies as unknown as { title?: string } | null
    return {
      id: String(data.id),
      date: String(data.show_date),
      time: String(data.show_time),
      theaterId: String(data.theater_id),
      movieId: String(data.movie_id),
      movieTitle: movie?.title ?? '',
    }
  },
  ['catalog', 'showtime-by-id'],
  { revalidate: TTL, tags: ['movie-showtimes'] },
)

export function getShowtimeById(showtimeId: string): Promise<ShowtimeLocation | null> {
  return getCached(showtimeId)
}
