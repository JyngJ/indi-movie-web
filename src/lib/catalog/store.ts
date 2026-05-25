import type { CatalogMovie, CatalogResponse, CatalogShowtime, CatalogTheater } from '@/types/catalog'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

interface TheaterRow {
  id: string
  name: string
  lat?: number | string | null
  lng?: number | string | null
  address?: string | null
  city?: string | null
  phone?: string | null
  website?: string | null
  screen_count?: number | null
  seat_count?: number | null
}

interface MovieRow {
  id: string
  title: string
  original_title?: string | null
  year?: number | null
  poster_url?: string | null
  synopsis?: string | null
  runtime_minutes?: number | null
  certification?: string | null
  genre?: string[] | null
  director?: string[] | null
}

interface ShowtimeRow {
  id: string
  theater_id: string
  movie_id: string
  screen_name?: string | null
  show_date: string
  show_time: string
  end_time?: string | null
  seat_available?: number | null
  seat_total?: number | null
  booking_url?: string | null
}

export async function getCatalog(): Promise<CatalogResponse> {
  const supabase = createSupabaseAdminClient()
  const today = new Date().toISOString().slice(0, 10)

  const [theatersResult, moviesResult, showtimesResult] = await Promise.all([
    supabase
      .from('theaters')
      .select('id, name, lat, lng, address, city, phone, website, screen_count, seat_count')
      .order('name', { ascending: true })
      .limit(500),
    supabase
      .from('movies')
      .select('id, title, original_title, year, poster_url, synopsis, runtime_minutes, certification, genre, director')
      .order('title', { ascending: true })
      .limit(1000),
    supabase
      .from('showtimes')
      .select('id, theater_id, movie_id, screen_name, show_date, show_time, end_time, seat_available, seat_total, booking_url')
      .eq('is_active', true)
      .gte('show_date', today)
      .order('show_date', { ascending: true })
      .order('show_time', { ascending: true })
      .limit(1000),
  ])

  if (theatersResult.error) throw new Error(theatersResult.error.message)
  if (moviesResult.error) throw new Error(moviesResult.error.message)
  if (showtimesResult.error) throw new Error(showtimesResult.error.message)

  return {
    theaters: ((theatersResult.data ?? []) as TheaterRow[]).map(theaterFromRow).filter(hasCoordinates),
    movies: ((moviesResult.data ?? []) as MovieRow[]).map(movieFromRow),
    showtimes: ((showtimesResult.data ?? []) as ShowtimeRow[]).map(showtimeFromRow),
    generatedAt: new Date().toISOString(),
  }
}

function theaterFromRow(row: TheaterRow): CatalogTheater {
  return {
    id: row.id,
    name: row.name,
    address: row.address ?? '',
    city: row.city ?? '',
    lat: Number(row.lat),
    lng: Number(row.lng),
    kind: 'indie',
    phone: row.phone ?? undefined,
    website: row.website ?? undefined,
    screenCount: row.screen_count ?? undefined,
    seatCount: row.seat_count ?? undefined,
  }
}

function movieFromRow(row: MovieRow): CatalogMovie {
  return {
    id: row.id,
    title: row.title,
    originalTitle: row.original_title ?? undefined,
    year: row.year ?? undefined,
    director: row.director?.filter(Boolean).join(', ') || undefined,
    synopsis: row.synopsis ?? undefined,
    tags: [...(row.genre ?? []), row.certification].filter((tag): tag is string => !!tag),
    posterUrl: row.poster_url ?? undefined,
    runtimeMinutes: row.runtime_minutes ?? undefined,
    certification: row.certification ?? undefined,
  }
}

function showtimeFromRow(row: ShowtimeRow): CatalogShowtime {
  const seatAvailable = Number(row.seat_available ?? 0)
  const seatTotal = Number(row.seat_total ?? 0)
  const kind = seatAvailable <= 0
    ? 'soldout'
    : row.show_time >= '23:00'
      ? 'late'
      : seatTotal > 0 && seatAvailable / seatTotal <= 0.15
        ? 'low'
        : 'normal'

  return {
    id: row.id,
    theaterId: row.theater_id,
    movieId: row.movie_id,
    startTime: row.show_time,
    endTime: row.end_time ?? '',
    showDate: row.show_date,
    seatAvailable,
    seatTotal,
    screenName: row.screen_name ?? '',
    kind,
    bookingUrl: row.booking_url ?? undefined,
  }
}

function hasCoordinates(theater: CatalogTheater): boolean {
  return Number.isFinite(theater.lat) && Number.isFinite(theater.lng)
}
