import type {
  AdminMovie,
  AdminServiceShowtime,
  AdminShowtimeInput,
  AdminShowtimeStatus,
  AdminTheater,
  AdminTheaterInput,
  AdminTheaterSource,
  CrawledShowtimeCandidate,
  CrawlRun,
} from '@/types/admin'

export interface CrawlSourceRow {
  id: string
  theater_id: string
  theater_name: string
  matched_theater_id?: string | null
  homepage_url: string | null
  listing_url: string
  parser: AdminTheaterSource['parser']
  enabled: boolean
  cadence: AdminTheaterSource['cadence']
  health: AdminTheaterSource['health']
  notes: string | null
  last_crawled_at?: string | null
}

export interface CrawlRunRow {
  id: string
  source_id: string
  source_name: string
  status: CrawlRun['status']
  input_kind: CrawlRun['inputKind']
  started_at: string
  finished_at: string | null
  created_count: number
  updated_count: number
  warning_count: number
  error: string | null
}

export interface CandidateRow {
  id: string
  source_id: string
  theater_id: string
  theater_name: string
  movie_title: string
  release_year?: number | null
  screen_name: string
  show_date: string
  show_time: string
  end_time: string | null
  format_type: CrawledShowtimeCandidate['formatType']
  language: CrawledShowtimeCandidate['language']
  seat_available: number
  seat_total: number
  price: number
  booking_url: string | null
  source_url: string | null
  raw_text: string
  confidence: number
  warnings: string[] | null
  status: AdminShowtimeStatus
  fingerprint: string
  matched_theater_id?: string | null
  matched_movie_id?: string | null
  approved_at?: string | null
  approved_by?: string | null
}

export interface TheaterRow {
  id: string
  name: string
  city?: string | null
  lat?: number | string | null
  lng?: number | string | null
  address?: string | null
  phone?: string | null
  website?: string | null
  instagram_url?: string | null
  screen_count?: number | null
  seat_count?: number | null
}

export interface MovieRow {
  id: string
  title: string
  original_title?: string | null
  year?: number | null
  kmdb_id?: string | null
  kmdb_movie_seq?: string | null
  poster_url?: string | null
  genre?: string[] | null
  director?: string[] | null
  nation?: string | null
  // movie_details join (optional)
  synopsis?: string | null
  runtime_minutes?: number | null
  certification?: string | null
}

export interface ShowtimeRow {
  id?: string
  theater_id: string
  movie_id: string
  screen_name: string
  show_date: string
  show_time: string
  end_time: string | null
  format_type: CrawledShowtimeCandidate['formatType']
  language: CrawledShowtimeCandidate['language']
  seat_available: number
  seat_total: number
  price: number
  booking_url: string | null
  is_active: boolean
  theaters?: { name: string } | Array<{ name: string }> | null
  movies?: { title: string } | Array<{ title: string }> | null
}

export function normalizeTime(value: string) {
  return value.slice(0, 5)
}

export function normalizeInstagramUrl(value?: string): string | null {
  const raw = value?.trim()
  if (!raw) return null
  // 이미 URL 형태면 username만 추출
  const fromUrl = raw.match(/instagram\.com\/([^/?#\s]+)/)?.[1]
  const username = fromUrl ?? raw.replace(/^@/, '')
  if (!username) return null
  return `https://www.instagram.com/${username}/`
}

export function sourceFromRow(row: CrawlSourceRow): AdminTheaterSource {
  return {
    id: row.id,
    theaterId: row.theater_id,
    theaterName: row.theater_name,
    matchedTheaterId: row.matched_theater_id ?? undefined,
    homepageUrl: row.homepage_url ?? '',
    listingUrl: row.listing_url,
    parser: row.parser,
    enabled: row.enabled,
    cadence: row.cadence,
    health: row.health,
    lastCrawledAt: row.last_crawled_at ?? undefined,
    notes: row.notes ?? undefined,
  }
}

export function sourceToRow(source: AdminTheaterSource) {
  return {
    id: source.id,
    theater_id: source.theaterId,
    theater_name: source.theaterName,
    matched_theater_id: source.matchedTheaterId ?? null,
    homepage_url: source.homepageUrl,
    listing_url: source.listingUrl,
    parser: source.parser,
    enabled: source.enabled,
    cadence: source.cadence,
    health: source.health,
    notes: source.notes ?? null,
  }
}

export function runFromRow(row: CrawlRunRow): CrawlRun {
  return {
    id: row.id,
    sourceId: row.source_id,
    sourceName: row.source_name,
    status: row.status,
    inputKind: row.input_kind,
    startedAt: row.started_at,
    finishedAt: row.finished_at ?? undefined,
    candidates: [],
    createdCount: row.created_count,
    updatedCount: row.updated_count,
    warningCount: row.warning_count,
    error: row.error ?? undefined,
  }
}

export function runToRow(run: CrawlRun) {
  return {
    id: run.id,
    source_id: run.sourceId,
    source_name: run.sourceName,
    status: run.status,
    input_kind: run.inputKind,
    started_at: run.startedAt,
    finished_at: run.finishedAt ?? null,
    created_count: run.createdCount,
    updated_count: run.updatedCount,
    warning_count: run.warningCount,
    error: run.error ?? null,
  }
}

export function candidateFromRow(row: CandidateRow): CrawledShowtimeCandidate {
  return {
    id: row.id,
    sourceId: row.source_id,
    theaterId: row.theater_id,
    theaterName: row.theater_name,
    movieTitle: row.movie_title,
    releaseYear: row.release_year ?? undefined,
    screenName: row.screen_name,
    showDate: row.show_date,
    showTime: normalizeTime(row.show_time),
    endTime: row.end_time ? normalizeTime(row.end_time) : undefined,
    formatType: row.format_type,
    language: row.language,
    seatAvailable: row.seat_available,
    seatTotal: row.seat_total,
    price: row.price,
    bookingUrl: row.booking_url ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    rawText: row.raw_text,
    confidence: Number(row.confidence),
    warnings: row.warnings ?? [],
    status: row.status,
    fingerprint: row.fingerprint,
    matchedTheaterId: row.matched_theater_id ?? undefined,
    matchedMovieId: row.matched_movie_id ?? undefined,
    approvedAt: row.approved_at ?? undefined,
    approvedBy: row.approved_by ?? undefined,
  }
}

export function candidateToRow(candidate: CrawledShowtimeCandidate, matchedTheaterId?: string) {
  return {
    id: candidate.id,
    source_id: candidate.sourceId,
    theater_id: candidate.theaterId,
    theater_name: candidate.theaterName,
    movie_title: candidate.movieTitle,
    release_year: candidate.releaseYear ?? null,
    screen_name: candidate.screenName,
    show_date: candidate.showDate,
    show_time: candidate.showTime,
    end_time: candidate.endTime ?? null,
    format_type: candidate.formatType,
    language: candidate.language,
    seat_available: candidate.seatAvailable,
    seat_total: candidate.seatTotal,
    price: candidate.price,
    booking_url: candidate.bookingUrl ?? null,
    source_url: candidate.sourceUrl ?? null,
    raw_text: candidate.rawText,
    confidence: candidate.confidence,
    warnings: candidate.warnings,
    status: candidate.status,
    fingerprint: candidate.fingerprint,
    matched_theater_id: matchedTheaterId ?? null,
  }
}

export function theaterFromRow(row: TheaterRow): AdminTheater {
  return {
    id: row.id,
    name: row.name,
    lat: Number(row.lat ?? 0),
    lng: Number(row.lng ?? 0),
    address: row.address ?? '',
    city: row.city ?? '',
    phone: row.phone ?? undefined,
    website: row.website ?? undefined,
    instagramUrl: row.instagram_url ?? undefined,
    screenCount: row.screen_count ?? 0,
    seatCount: row.seat_count ?? undefined,
  }
}

export function theaterToRow(input: AdminTheaterInput) {
  const name = input.name.trim()
  const address = input.address.trim()
  const city = input.city.trim()

  if (!name) throw new Error('극장명은 필수입니다.')
  if (!address) throw new Error('주소는 필수입니다.')
  if (!city) throw new Error('도시는 필수입니다.')
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) {
    throw new Error('위도와 경도는 숫자여야 합니다.')
  }

  return {
    name,
    lat: input.lat,
    lng: input.lng,
    address,
    city,
    phone: input.phone?.trim() || null,
    website: input.website?.trim() || null,
    instagram_url: normalizeInstagramUrl(input.instagramUrl),
    screen_count: input.screenCount ?? 0,
    seat_count: input.seatCount ?? null,
  }
}

export function movieFromRow(row: MovieRow): AdminMovie {
  return {
    id: row.id,
    title: row.title,
    originalTitle: row.original_title ?? undefined,
    year: row.year ?? new Date().getFullYear(),
    genre: row.genre ?? [],
    director: row.director ?? [],
    nation: row.nation ?? undefined,
    kmdbId: row.kmdb_id ?? undefined,
    kmdbMovieSeq: row.kmdb_movie_seq ?? undefined,
    posterUrl: row.poster_url ?? undefined,
    synopsis: row.synopsis ?? undefined,
    runtimeMinutes: row.runtime_minutes ?? undefined,
    certification: row.certification ?? undefined,
  }
}

export function serviceShowtimeFromRow(row: ShowtimeRow): AdminServiceShowtime {
  const theater = Array.isArray(row.theaters) ? row.theaters[0] : row.theaters
  const movie = Array.isArray(row.movies) ? row.movies[0] : row.movies

  return {
    id: row.id ?? '',
    theaterId: row.theater_id,
    theaterName: theater?.name ?? '',
    movieId: row.movie_id,
    movieTitle: movie?.title ?? '',
    screenName: row.screen_name,
    showDate: row.show_date,
    showTime: normalizeTime(row.show_time),
    endTime: row.end_time ? normalizeTime(row.end_time) : undefined,
    formatType: row.format_type,
    language: row.language,
    seatAvailable: row.seat_available,
    seatTotal: row.seat_total,
    price: row.price,
    bookingUrl: row.booking_url ?? undefined,
    isActive: row.is_active,
  }
}

export function showtimeInputToRow(input: AdminShowtimeInput) {
  if (!input.id) throw new Error('수정할 상영시간표 ID가 필요합니다.')
  if (!input.theaterId) throw new Error('극장 매칭이 필요합니다.')
  if (!input.movieId) throw new Error('영화 매칭이 필요합니다.')
  if (!input.screenName.trim()) throw new Error('상영관명은 필수입니다.')
  if (!input.showDate) throw new Error('상영일은 필수입니다.')
  if (!input.showTime) throw new Error('상영 시작 시간은 필수입니다.')

  return {
    theater_id: input.theaterId,
    movie_id: input.movieId,
    screen_name: input.screenName.trim(),
    show_date: input.showDate,
    show_time: input.showTime,
    end_time: input.endTime || null,
    format_type: input.formatType,
    language: input.language,
    seat_available: input.seatAvailable,
    seat_total: input.seatTotal,
    price: input.price,
    booking_url: input.bookingUrl?.trim() || null,
    is_active: input.isActive,
  }
}
