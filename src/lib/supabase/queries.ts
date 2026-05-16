import { useQuery } from '@tanstack/react-query'
import { createSupabaseBrowserClient } from './browser'
import type { Theater, Movie, Showtime, Station } from '@/types/api'

function supabase() {
  return createSupabaseBrowserClient()
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isMissingColumnError(error: unknown, column: string) {
  if (!error || typeof error !== 'object' || !('message' in error)) return false
  const message = String(error.message).toLowerCase()
  return message.includes(column.toLowerCase()) && (message.includes('column') || message.includes('schema cache'))
}

/* ── 영화관 목록 ────────────────────────────────────────────────── */
export function useTheaters() {
  return useQuery<Theater[]>({
    queryKey: ['theaters'],
    queryFn: async () => {
      const { data, error } = await supabase()
        .from('theaters')
        .select('id,name,lat,lng,address,city,phone,website,instagram_url,screen_count,seat_count,parking,restaurant,accessibility,rating,created_at,updated_at')
        .order('name')

      if (error) throw error

      return (data ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        lat: Number(r.lat),
        lng: Number(r.lng),
        address: r.address,
        city: r.city,
        phone: r.phone ?? undefined,
        website: r.website ?? undefined,
        instagramUrl: r.instagram_url ?? undefined,
        screenCount: r.screen_count,
        seatCount: r.seat_count ?? undefined,
        amenities: {
          parking: r.parking,
          restaurant: r.restaurant,
          accessibility: r.accessibility,
        },
        rating: r.rating ?? undefined,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }))
    },
    staleTime: 5 * 60 * 1000,
  })
}

/* ── 지하철역 목록 ─────────────────────────────────────────────── */
export function useStations() {
  return useQuery<Station[]>({
    queryKey: ['stations'],
    queryFn: async () => {
      const { data, error } = await supabase()
        .from('stations')
        .select('id,source_id,name,lines,lat,lng,city,district,neighborhood,aliases')
        .order('name')

      if (error) throw error

      return (data ?? []).map((r) => ({
        id: r.id,
        sourceId: r.source_id ?? undefined,
        name: r.name,
        lines: (r.lines as string[] | null) ?? [],
        lat: Number(r.lat),
        lng: Number(r.lng),
        city: r.city,
        district: r.district ?? undefined,
        neighborhood: r.neighborhood ?? undefined,
        aliases: (r.aliases as string[] | null) ?? [],
      }))
    },
    staleTime: 10 * 60 * 1000,
  })
}

/* ── 영화 목록 (경량 — 지도/검색용) ────────────────────────────── */
// synopsis, runtime, certification, cast 는 movie_details 테이블로 분리됨
export function useMovies() {
  return useQuery<Movie[]>({
    queryKey: ['movies'],
    queryFn: async () => {
      const primary = await supabase()
        .from('movies')
        .select('id,title,original_title,year,poster_url,genre,director,nation,kmdb_id,tmdb_id,rating')
        .order('title')
      const { data, error } = primary.error && isMissingColumnError(primary.error, 'nation')
        ? await supabase()
          .from('movies')
          .select('id,title,original_title,year,poster_url,genre,director,kmdb_id,tmdb_id,rating')
          .order('title')
        : primary

      if (error) throw error

      return (data ?? []).map((r) => {
        const row = r as Record<string, unknown>
        return {
          id: String(row.id),
          title: String(row.title),
          originalTitle: row.original_title ? String(row.original_title) : undefined,
          year: Number(row.year),
          posterUrl: row.poster_url ? String(row.poster_url) : undefined,
          genre: (row.genre as string[] | null) ?? [],
          director: (row.director as string[] | null) ?? [],
          nation: row.nation ? String(row.nation) : undefined,
          kmdbId: row.kmdb_id ? String(row.kmdb_id) : undefined,
          tmdbId: row.tmdb_id ? Number(row.tmdb_id) : undefined,
          rating: row.rating ? Number(row.rating) : undefined,
        }
      })
    },
    staleTime: 10 * 60 * 1000,
  })
}

/* ── 영화 상세 (movie_details 조인) ────────────────────────────── */
export interface MovieDetail extends Movie {
  synopsis?: string
  runtimeMinutes?: number
  certification?: string
  cast: Array<{ name: string; character?: string; profileUrl?: string }>
}

export function useMovieDetail(movieId: string | null) {
  return useQuery<MovieDetail | null>({
    queryKey: ['movie-detail', movieId],
    enabled: !!movieId,
    queryFn: async () => {
      const { data, error } = await supabase()
        .from('movies')
        .select(`
          id, title, original_title, year, poster_url, genre, director,
          nation, kmdb_id, tmdb_id, rating,
          movie_details (
            synopsis,
            runtime_minutes,
            certification,
            cast_members
          )
        `)
        .eq('id', movieId!)
        .single()

      if (error) throw error
      if (!data) return null

      const row = data as Record<string, unknown>
      const details = row.movie_details as Record<string, unknown> | null

      return {
        id: String(row.id),
        title: String(row.title),
        originalTitle: row.original_title ? String(row.original_title) : undefined,
        year: Number(row.year),
        posterUrl: row.poster_url ? String(row.poster_url) : undefined,
        genre: (row.genre as string[] | null) ?? [],
        director: (row.director as string[] | null) ?? [],
        nation: row.nation ? String(row.nation) : undefined,
        kmdbId: row.kmdb_id ? String(row.kmdb_id) : undefined,
        tmdbId: row.tmdb_id ? Number(row.tmdb_id) : undefined,
        rating: row.rating ? Number(row.rating) : undefined,
        synopsis: details?.synopsis ? String(details.synopsis) : undefined,
        runtimeMinutes: details?.runtime_minutes ? Number(details.runtime_minutes) : undefined,
        certification: details?.certification ? String(details.certification) : undefined,
        cast: (details?.cast_members as MovieDetail['cast'] | null) ?? [],
      }
    },
    staleTime: 10 * 60 * 1000,
  })
}

/* ── 오늘 포함 미래 상영 스케줄이 있는 영화 ID 목록 ─────────────── */
export function useActiveMovieIds() {
  const today = formatLocalDate(new Date())

  return useQuery<string[]>({
    queryKey: ['active-movie-ids', today],
    queryFn: async () => {
      const { data, error } = await supabase()
        .from('showtimes')
        .select('movie_id')
        .eq('is_active', true)
        .gte('show_date', today)

      if (error) throw error

      return Array.from(new Set((data ?? []).map((r) => r.movie_id).filter(Boolean)))
    },
    staleTime: 2 * 60 * 1000,
  })
}

export interface MapShowtimeMovie {
  id: string
  title: string
  posterUrl?: string
  genre: string[]
  nation?: string
}

export interface MapShowtime {
  id: string
  theaterId: string
  movieId: string
  showDate: string
  showTime: string
  seatAvailable: number
  bookingUrl?: string
  movie: MapShowtimeMovie | null
}

/* ── 지도 포스터 집계용 상영 시간표 ─────────────────────────────── */
export function useMapShowtimes(startDate: string, endDate: string) {
  return useQuery<MapShowtime[]>({
    queryKey: ['map-showtimes', startDate, endDate],
    queryFn: async () => {
      const primary = await supabase()
        .from('showtimes')
        .select(`
          id,
          theater_id,
          movie_id,
          show_date,
          show_time,
          seat_available,
          booking_url,
          movies (
            id,
            title,
            poster_url,
            genre,
            nation
          )
        `)
        .eq('is_active', true)
        .gte('show_date', startDate)
        .lte('show_date', endDate)
        .order('show_date', { ascending: true })
        .order('show_time', { ascending: true })
        .limit(5000)
      const { data, error } = primary.error && isMissingColumnError(primary.error, 'nation')
        ? await supabase()
          .from('showtimes')
          .select(`
            id,
            theater_id,
            movie_id,
            show_date,
            show_time,
            seat_available,
            booking_url,
            movies (
              id,
              title,
              poster_url,
              genre
            )
          `)
          .eq('is_active', true)
          .gte('show_date', startDate)
          .lte('show_date', endDate)
          .order('show_date', { ascending: true })
          .order('show_time', { ascending: true })
          .limit(5000)
        : primary

      if (error) throw error

      return (data ?? []).map((r) => {
        const movie = r.movies as unknown as Record<string, unknown> | null
        return {
          id: r.id,
          theaterId: r.theater_id,
          movieId: String(r.movie_id),
          showDate: r.show_date,
          showTime: r.show_time,
          seatAvailable: Number(r.seat_available ?? 0),
          bookingUrl: r.booking_url ?? undefined,
          movie: movie ? {
            id: String(movie.id),
            title: String(movie.title),
            posterUrl: movie.poster_url ? String(movie.poster_url) : undefined,
            genre: (movie.genre as string[] | null) ?? [],
            nation: movie.nation ? String(movie.nation) : undefined,
          } : null,
        }
      })
    },
    staleTime: 2 * 60 * 1000,
  })
}

/* ── 특정 영화관의 전체 상영 영화 (날짜 무관, 7일 범위) ─────────── */
export interface TheaterMovieEntry {
  movie: Movie
  showtimeCount: number
  earliestDate: string
  availableDates: Set<string>
}

export function useTheaterAllMovies(theaterId: string | null) {
  const today = formatLocalDate(new Date())
  const endDate = formatLocalDate(new Date(Date.now() + 6 * 24 * 60 * 60 * 1000))

  return useQuery<TheaterMovieEntry[]>({
    queryKey: ['theater-all-movies', theaterId, today],
    enabled: !!theaterId,
    queryFn: async () => {
      const primary = await supabase()
        .from('showtimes')
        .select(`
          movie_id,
          show_date,
          movies (
            id, title, original_title, year, poster_url, genre, director,
            nation, kmdb_id, tmdb_id, rating,
            movie_details(synopsis, runtime_minutes, certification)
          )
        `)
        .eq('theater_id', theaterId!)
        .eq('is_active', true)
        .gte('show_date', today)
        .lte('show_date', endDate)
        .order('show_date')
        .limit(1000)

      const { data, error } = primary.error && isMissingColumnError(primary.error, 'nation')
        ? await supabase()
          .from('showtimes')
          .select(`
            movie_id,
            show_date,
            movies (
              id, title, original_title, year, poster_url, genre, director,
              kmdb_id, tmdb_id, rating,
              movie_details(synopsis, runtime_minutes, certification)
            )
          `)
          .eq('theater_id', theaterId!)
          .eq('is_active', true)
          .gte('show_date', today)
          .lte('show_date', endDate)
          .order('show_date')
          .limit(1000)
        : primary

      if (error) throw error

      const entryMap = new Map<string, TheaterMovieEntry>()
      for (const r of data ?? []) {
        const m = r.movies as unknown as Record<string, unknown> | null
        if (!m) continue
        const movieId = String(m.id)

        if (!entryMap.has(movieId)) {
          const details = m.movie_details as Record<string, unknown> | null
          entryMap.set(movieId, {
            movie: {
              id: movieId,
              title: String(m.title),
              originalTitle: m.original_title ? String(m.original_title) : undefined,
              year: Number(m.year),
              posterUrl: m.poster_url ? String(m.poster_url) : undefined,
              genre: (m.genre as string[]) ?? [],
              director: (m.director as string[]) ?? [],
              nation: m.nation ? String(m.nation) : undefined,
              synopsis: details?.synopsis ? String(details.synopsis) : undefined,
              runtimeMinutes: details?.runtime_minutes ? Number(details.runtime_minutes) : undefined,
              certification: details?.certification ? String(details.certification) : undefined,
              kmdbId: m.kmdb_id ? String(m.kmdb_id) : undefined,
              tmdbId: m.tmdb_id ? Number(m.tmdb_id) : undefined,
              rating: m.rating ? Number(m.rating) : undefined,
            },
            showtimeCount: 0,
            earliestDate: r.show_date,
            availableDates: new Set(),
          })
        }

        const entry = entryMap.get(movieId)!
        entry.showtimeCount++
        entry.availableDates.add(r.show_date)
        if (r.show_date < entry.earliestDate) entry.earliestDate = r.show_date
      }

      return Array.from(entryMap.values()).sort((a, b) => b.showtimeCount - a.showtimeCount)
    },
    staleTime: 2 * 60 * 1000,
  })
}

/* ── 특정 영화관의 상영 시간표 ──────────────────────────────────── */
export function useTheaterShowtimes(theaterId: string | null, date: string) {
  return useQuery<{ movies: Movie[]; showtimes: Showtime[] }>({
    queryKey: ['theater-showtimes', theaterId, date],
    enabled: !!theaterId,
    queryFn: async () => {
      const primary = await supabase()
        .from('showtimes')
        .select(`
          id,
          screen_name,
          show_date,
          show_time,
          end_time,
          format_type,
          language,
          seat_available,
          seat_total,
          price,
          booking_url,
          movie_id,
          movies (
            id,
            title,
            original_title,
            year,
            poster_url,
            genre,
            director,
            nation,
            kmdb_id,
            tmdb_id,
            rating,
            movie_details(synopsis, runtime_minutes, certification)
          )
        `)
        .eq('theater_id', theaterId!)
        .eq('show_date', date)
        .eq('is_active', true)
        .order('show_time')
      const { data, error } = primary.error && isMissingColumnError(primary.error, 'nation')
        ? await supabase()
          .from('showtimes')
          .select(`
            id,
            screen_name,
            show_date,
            show_time,
            end_time,
            format_type,
            language,
            seat_available,
            seat_total,
            price,
            booking_url,
            movie_id,
            movies (
              id,
              title,
              original_title,
              year,
              poster_url,
              genre,
              director,
              kmdb_id,
              tmdb_id,
              rating,
              movie_details(synopsis, runtime_minutes, certification)
            )
          `)
          .eq('theater_id', theaterId!)
          .eq('show_date', date)
          .eq('is_active', true)
          .order('show_time')
        : primary

      if (error) throw error

      const rows = data ?? []

      // movie 중복 제거
      const movieMap = new Map<string, Movie>()
      for (const r of rows) {
        const m = r.movies as unknown as Record<string, unknown> | null
        if (!m || movieMap.has(r.movie_id)) continue
        const details = m.movie_details as Record<string, unknown> | null
        movieMap.set(r.movie_id, {
          id: String(m.id),
          title: String(m.title),
          originalTitle: m.original_title ? String(m.original_title) : undefined,
          year: Number(m.year),
          posterUrl: m.poster_url ? String(m.poster_url) : undefined,
          genre: (m.genre as string[]) ?? [],
          director: (m.director as string[]) ?? [],
          nation: m.nation ? String(m.nation) : undefined,
          synopsis: details?.synopsis ? String(details.synopsis) : undefined,
          runtimeMinutes: details?.runtime_minutes ? Number(details.runtime_minutes) : undefined,
          certification: details?.certification ? String(details.certification) : undefined,
          kmdbId: m.kmdb_id ? String(m.kmdb_id) : undefined,
          tmdbId: m.tmdb_id ? Number(m.tmdb_id) : undefined,
          rating: m.rating ? Number(m.rating) : undefined,
        })
      }

      const showtimes: Showtime[] = rows.map((r) => ({
        id: r.id,
        movieId: r.movie_id,
        movieTitle: (r.movies as unknown as Record<string, unknown> | null)?.title as string ?? '',
        theaterId: theaterId!,
        screenName: r.screen_name,
        showDate: r.show_date,
        showTime: r.show_time,
        endTime: r.end_time ?? undefined,
        formatType: r.format_type as Showtime['formatType'],
        language: r.language as Showtime['language'],
        seatAvailable: r.seat_available,
        seatTotal: r.seat_total,
        price: r.price,
        bookingUrl: r.booking_url ?? undefined,
      }))

      return {
        movies: Array.from(movieMap.values()),
        showtimes,
      }
    },
    staleTime: 2 * 60 * 1000,
  })
}

/* ── 영화별 상영 영화관 + 오늘 상영시간 ─────────────────────────── */
export interface MovieTheaterEntry {
  theaterId: string
  theaterName: string
  theaterAddress: string
  showtimes: Showtime[]
}

export function useMovieTheaterShowtimes(movieId: string | null) {
  const today = formatLocalDate(new Date())

  return useQuery<MovieTheaterEntry[]>({
    queryKey: ['movie-theater-showtimes', movieId, today],
    enabled: !!movieId,
    queryFn: async () => {
      const { data, error } = await supabase()
        .from('showtimes')
        .select(`
          id,
          theater_id,
          show_date,
          show_time,
          end_time,
          seat_available,
          seat_total,
          booking_url,
          screen_name,
          theaters (
            id,
            name,
            address
          )
        `)
        .eq('movie_id', movieId!)
        .eq('is_active', true)
        .eq('show_date', today)
        .order('show_time')
        .limit(500)

      if (error) throw error

      const theaterMap = new Map<string, MovieTheaterEntry>()
      for (const r of data ?? []) {
        const th = r.theaters as unknown as { id: string; name: string; address: string } | null
        if (!th) continue

        if (!theaterMap.has(th.id)) {
          theaterMap.set(th.id, {
            theaterId: th.id,
            theaterName: th.name,
            theaterAddress: th.address,
            showtimes: [],
          })
        }

        theaterMap.get(th.id)!.showtimes.push({
          id: r.id,
          movieId: movieId!,
          movieTitle: '',
          theaterId: th.id,
          screenName: r.screen_name,
          showDate: r.show_date,
          showTime: r.show_time,
          endTime: r.end_time ?? undefined,
          formatType: 'standard' as const,
          language: 'korean' as const,
          seatAvailable: Number(r.seat_available ?? 0),
          seatTotal: Number(r.seat_total ?? 0),
          price: 0,
          bookingUrl: r.booking_url ?? undefined,
        })
      }

      return Array.from(theaterMap.values())
    },
    staleTime: 2 * 60 * 1000,
  })
}
