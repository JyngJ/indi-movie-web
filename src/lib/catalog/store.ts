import type { CatalogMovie, CatalogResponse, CatalogShowtime, CatalogTheater } from '@/types/catalog'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { isAlmostSoldOut } from './seatAvailability'
import { isLateNightTime } from './lateNight'

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

interface MovieDetailsRow {
  synopsis?: string | null
  runtime_minutes?: number | null
  certification?: string | null
}

interface MovieRow {
  id: string
  title: string
  original_title?: string | null
  year?: number | null
  poster_url?: string | null
  genre?: string[] | null
  director?: string[] | null
  movie_details?: MovieDetailsRow | MovieDetailsRow[] | null
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

// Supabase PostgREST는 서버 설정(db-max-rows)에 따라 단일 응답 행 수를 제한할 수 있으므로,
// 페이지 단위 .range() 루프로 전체 행을 수집한다.
const PAGE_SIZE = 1000
// 무한 루프 및 응답 폭주 방지용 안전 상한 (테이블당 최대 PAGE_SIZE * MAX_PAGES 행)
const MAX_PAGES = 20

interface PageResult {
  data: unknown[] | null
  error: { message: string } | null
}

async function fetchAllRows<T>(
  table: string,
  buildPageQuery: (from: number, to: number) => PromiseLike<PageResult>,
): Promise<T[]> {
  const rows: T[] = []

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * PAGE_SIZE
    const { data, error } = await buildPageQuery(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(error.message)

    const batch = (data ?? []) as T[]
    rows.push(...batch)
    if (batch.length < PAGE_SIZE) return rows
  }

  console.error(
    `[CATALOG_TRUNCATION] table=${table} rows>=${PAGE_SIZE * MAX_PAGES} 안전 상한 도달, 응답이 잘렸을 수 있음`,
  )
  return rows
}

export async function getCatalog(): Promise<CatalogResponse> {
  const supabase = createSupabaseAdminClient()
  const today = new Date().toISOString().slice(0, 10)

  const [theaterRows, movieRows, showtimeRows] = await Promise.all([
    fetchAllRows<TheaterRow>('theaters', (from, to) =>
      supabase
        .from('theaters')
        .select('id, name, lat, lng, address, city, phone, website, screen_count, seat_count')
        .order('name', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to),
    ),
    fetchAllRows<MovieRow>('movies', (from, to) =>
      supabase
        .from('movies')
        .select('id, title, original_title, year, poster_url, genre, director, movie_details(synopsis, runtime_minutes, certification)')
        .order('title', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to),
    ),
    fetchAllRows<ShowtimeRow>('showtimes', (from, to) =>
      supabase
        .from('showtimes')
        .select('id, theater_id, movie_id, screen_name, show_date, show_time, end_time, seat_available, seat_total, booking_url')
        .eq('is_active', true)
        .gte('show_date', today)
        .order('show_date', { ascending: true })
        .order('show_time', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to),
    ),
  ])

  return {
    theaters: theaterRows.map(theaterFromRow).filter(hasCoordinates),
    movies: movieRows.map(movieFromRow),
    showtimes: showtimeRows.map(showtimeFromRow),
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
  const details = Array.isArray(row.movie_details) ? row.movie_details[0] : row.movie_details

  return {
    id: row.id,
    title: row.title,
    originalTitle: row.original_title ?? undefined,
    year: row.year ?? undefined,
    director: row.director?.filter(Boolean).join(', ') || undefined,
    synopsis: details?.synopsis ?? undefined,
    tags: [...(row.genre ?? []), details?.certification].filter((tag): tag is string => !!tag),
    posterUrl: row.poster_url ?? undefined,
    runtimeMinutes: details?.runtime_minutes ?? undefined,
    certification: details?.certification ?? undefined,
  }
}

function showtimeFromRow(row: ShowtimeRow): CatalogShowtime {
  const seatAvailable = Number(row.seat_available ?? 0)
  const seatTotal = Number(row.seat_total ?? 0)
  const kind = seatAvailable <= 0
    ? 'soldout'
    : isLateNightTime(row.show_time)
      ? 'late'
      : isAlmostSoldOut(seatAvailable, seatTotal)
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
