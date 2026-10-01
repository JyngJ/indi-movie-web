import type { SupabaseClient } from '@supabase/supabase-js'
import type { Movie, Showtime } from '@/types/api'
import { toSecureImageUrl } from '@/lib/media/imageUrl'

/**
 * 극장 상세의 시간표 조회 — `/api/public/theater/[id]/{movies,showtimes}`와
 * 극장 상세 SSR(초기 데이터)이 같이 쓴다. 두 곳이 같은 모양을 내야 클라이언트 캐시에
 * 서버가 심은 값을 그대로 넣을 수 있다.
 */

/** 날짜 범위 안에 상영이 잡힌 영화 하나 — availableDates는 JSON이라 배열 */
export interface TheaterMovieEntryRow {
  movie: Movie
  showtimeCount: number
  earliestDate: string
  availableDates: string[]
}

export interface TheaterDayShowtimes {
  movies: Movie[]
  showtimes: Showtime[]
}

const MOVIE_COLUMNS = `
  id, title, original_title, year, poster_url, genre, director,
  nation, kmdb_id, tmdb_id,
  movie_details(synopsis, runtime_minutes, certification)
`

function toMovie(m: Record<string, unknown>): Movie {
  const details = m.movie_details as Record<string, unknown> | null
  return {
    id: String(m.id),
    title: String(m.title),
    originalTitle: m.original_title ? String(m.original_title) : undefined,
    year: Number(m.year),
    posterUrl: m.poster_url ? toSecureImageUrl(String(m.poster_url)) : undefined,
    genre: (m.genre as string[]) ?? [],
    director: (m.director as string[]) ?? [],
    nation: m.nation ? String(m.nation) : undefined,
    synopsis: details?.synopsis ? String(details.synopsis) : undefined,
    runtimeMinutes: details?.runtime_minutes ? Number(details.runtime_minutes) : undefined,
    certification: details?.certification ? String(details.certification) : undefined,
    kmdbId: m.kmdb_id ? String(m.kmdb_id) : undefined,
    tmdbId: m.tmdb_id ? Number(m.tmdb_id) : undefined,
  } as Movie
}

/** from~to(YYYY-MM-DD, 양끝 포함)에 상영이 있는 영화 — 회차 많은 순 */
export async function fetchTheaterMovieEntries(
  supabase: SupabaseClient,
  theaterId: string,
  from: string,
  to: string,
): Promise<TheaterMovieEntryRow[]> {
  const { data, error } = await supabase
    .from('showtimes')
    .select(`movie_id, show_date, movies (${MOVIE_COLUMNS})`)
    .eq('theater_id', theaterId)
    .eq('is_active', true)
    .gte('show_date', from)
    .lte('show_date', to)
    .order('show_date')
    .limit(1000)

  if (error) throw new Error(error.message)

  const entryMap = new Map<string, TheaterMovieEntryRow>()
  for (const r of data ?? []) {
    const m = r.movies as unknown as Record<string, unknown> | null
    if (!m) continue
    const movieId = String(m.id)
    if (!entryMap.has(movieId)) {
      entryMap.set(movieId, {
        movie: toMovie(m),
        showtimeCount: 0,
        earliestDate: r.show_date,
        availableDates: [],
      })
    }
    const entry = entryMap.get(movieId)!
    entry.showtimeCount++
    if (!entry.availableDates.includes(r.show_date)) entry.availableDates.push(r.show_date)
    if (r.show_date < entry.earliestDate) entry.earliestDate = r.show_date
  }

  return Array.from(entryMap.values()).sort((a, b) => b.showtimeCount - a.showtimeCount)
}

/** 하루치 회차와 그 회차들의 영화 */
export async function fetchTheaterDayShowtimes(
  supabase: SupabaseClient,
  theaterId: string,
  date: string,
): Promise<TheaterDayShowtimes> {
  const { data, error } = await supabase
    .from('showtimes')
    .select(`
      id, screen_name, show_date, show_time, end_time, format_type, language,
      seat_available, seat_total, price, booking_url, movie_id,
      movies (${MOVIE_COLUMNS})
    `)
    .eq('theater_id', theaterId)
    .eq('show_date', date)
    .eq('is_active', true)
    .order('show_time')

  if (error) throw new Error(error.message)

  const rows = data ?? []
  const movieMap = new Map<string, Movie>()
  for (const r of rows) {
    const m = r.movies as unknown as Record<string, unknown> | null
    if (!m || movieMap.has(r.movie_id)) continue
    movieMap.set(r.movie_id, toMovie(m))
  }

  const showtimes = rows.map((r) => ({
    id: r.id,
    movieId: r.movie_id,
    movieTitle: (r.movies as unknown as Record<string, unknown> | null)?.title as string ?? '',
    theaterId,
    screenName: r.screen_name,
    showDate: r.show_date,
    showTime: r.show_time,
    endTime: r.end_time ?? undefined,
    formatType: r.format_type,
    language: r.language,
    seatAvailable: r.seat_available,
    seatTotal: r.seat_total,
    price: r.price,
    bookingUrl: r.booking_url ?? undefined,
  })) as Showtime[]

  return { movies: Array.from(movieMap.values()), showtimes }
}
