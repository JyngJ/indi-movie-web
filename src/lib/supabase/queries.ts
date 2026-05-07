import { useQuery } from '@tanstack/react-query'
import { createSupabaseBrowserClient } from './browser'
import type { Theater, Movie, Showtime } from '@/types/api'

function supabase() {
  return createSupabaseBrowserClient()
}

/* ── 영화관 목록 ────────────────────────────────────────────────── */
export function useTheaters() {
  return useQuery<Theater[]>({
    queryKey: ['theaters'],
    queryFn: async () => {
      const { data, error } = await supabase()
        .from('theaters')
        .select('id,name,lat,lng,address,city,phone,website,screen_count,seat_count,parking,restaurant,accessibility,rating,created_at,updated_at')
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

/* ── 특정 영화관의 상영 시간표 ──────────────────────────────────── */
export function useTheaterShowtimes(theaterId: string | null, date: string) {
  return useQuery<{ movies: Movie[]; showtimes: Showtime[] }>({
    queryKey: ['theater-showtimes', theaterId, date],
    enabled: !!theaterId,
    queryFn: async () => {
      const { data, error } = await supabase()
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
            synopsis,
            runtime_minutes,
            certification,
            kmdb_id,
            tmdb_id,
            rating
          )
        `)
        .eq('theater_id', theaterId!)
        .eq('show_date', date)
        .eq('is_active', true)
        .order('show_time')

      if (error) throw error

      const rows = data ?? []

      // movie 중복 제거
      const movieMap = new Map<string, Movie>()
      for (const r of rows) {
        const m = r.movies as unknown as Record<string, unknown> | null
        if (!m || movieMap.has(r.movie_id)) continue
        movieMap.set(r.movie_id, {
          id: String(m.id),
          title: String(m.title),
          originalTitle: m.original_title ? String(m.original_title) : undefined,
          year: Number(m.year),
          posterUrl: m.poster_url ? String(m.poster_url) : undefined,
          genre: (m.genre as string[]) ?? [],
          director: (m.director as string[]) ?? [],
          synopsis: m.synopsis ? String(m.synopsis) : undefined,
          runtimeMinutes: m.runtime_minutes ? Number(m.runtime_minutes) : undefined,
          certification: m.certification ? String(m.certification) : undefined,
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
