import type {
  AdminExternalMovie,
  AdminTheaterSource,
  AdminTheaterSourceInput,
  AdminMovie,
  AdminMatchOptions,
  AdminMovieInput,
  AdminServiceShowtime,
  AdminShowtimeStatus,
  AdminShowtimeInput,
  AdminTheater,
  AdminTheaterInput,
  CandidateAutoMatchResult,
  CandidateMatchPayload,
  CrawledShowtimeCandidate,
  CrawlRun,
  ShowtimeApprovalResult,
} from '@/types/admin'
import { searchKmdbMovies } from '@/lib/admin/kmdb'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

interface CrawlSourceRow {
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

interface CrawlRunRow {
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

interface CandidateRow {
  id: string
  source_id: string
  theater_id: string
  theater_name: string
  movie_title: string
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

interface TheaterRow {
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

interface MovieRow {
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

interface ShowtimeRow {
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

export async function listAdminSources() {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('crawl_sources')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return ((data ?? []) as CrawlSourceRow[]).map(sourceFromRow)
}

export async function getAdminSource(sourceId: string) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('crawl_sources')
    .select('*')
    .eq('id', sourceId)
    .maybeSingle()

  if (error) throw new Error(error.message)

  return data ? sourceFromRow(data as CrawlSourceRow) : undefined
}

export async function createAdminSource(input: AdminTheaterSourceInput) {
  const theaterName = input.theaterName.trim()
  const listingUrl = input.listingUrl.trim()
  const homepageUrl = input.homepageUrl.trim() || originFromUrl(listingUrl)

  if (!theaterName || !listingUrl) {
    throw new Error('극장명과 상영시간표 URL은 필수입니다.')
  }

  const source: AdminTheaterSource = {
    id: `${slugify(theaterName)}-homepage`,
    theaterId: slugify(theaterName),
    theaterName,
    matchedTheaterId: input.matchedTheaterId,
    homepageUrl,
    listingUrl,
    parser: input.parser,
    enabled: true,
    cadence: input.cadence,
    health: 'healthy',
    notes: input.notes?.trim(),
  }
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('crawl_sources')
    .insert(sourceToRow(source))
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('이미 같은 극장명으로 등록된 크롤링 소스가 있습니다.')
    }

    throw new Error(error.message)
  }

  return sourceFromRow(data as CrawlSourceRow)
}

export async function deleteAdminSource(sourceId: string) {
  const normalizedSourceId = sourceId.trim()
  if (!normalizedSourceId) throw new Error('삭제할 크롤링 소스 ID가 필요합니다.')

  const supabase = createSupabaseAdminClient()
  const { error: candidateError } = await supabase
    .from('showtime_candidates')
    .delete()
    .eq('source_id', normalizedSourceId)

  if (candidateError) throw new Error(candidateError.message)

  const { error: runError } = await supabase
    .from('crawl_runs')
    .delete()
    .eq('source_id', normalizedSourceId)

  if (runError) throw new Error(runError.message)

  const { error: sourceError } = await supabase
    .from('crawl_sources')
    .delete()
    .eq('id', normalizedSourceId)

  if (sourceError) throw new Error(sourceError.message)

  return { id: normalizedSourceId }
}

export async function saveCrawlRun(run: CrawlRun) {
  const supabase = createSupabaseAdminClient()
  const { error: runError } = await supabase
    .from('crawl_runs')
    .insert(runToRow(run))

  if (runError) throw new Error(runError.message)

  if (run.candidates.length > 0) {
    const source = await getAdminSource(run.sourceId)
    const { error: candidateError } = await supabase
      .from('showtime_candidates')
      .upsert(run.candidates.map((candidate) => candidateToRow(candidate, source?.matchedTheaterId)), {
        onConflict: 'fingerprint',
      })

    if (candidateError) throw new Error(candidateError.message)
  }

  return run
}

export async function listCrawlRuns() {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('crawl_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(20)

  if (error) throw new Error(error.message)

  return ((data ?? []) as CrawlRunRow[]).map(runFromRow)
}

export async function listReviewCandidates(status?: AdminShowtimeStatus) {
  const supabase = createSupabaseAdminClient()
  let query = supabase
    .from('showtime_candidates')
    .select('*')
    .order('show_date', { ascending: true })
    .order('show_time', { ascending: true })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)

  return ((data ?? []) as CandidateRow[]).map(candidateFromRow).sort((a, b) => {
    const statusOrder = scoreStatus(a.status) - scoreStatus(b.status)
    if (statusOrder !== 0) return statusOrder
    return `${a.showDate} ${a.showTime}`.localeCompare(`${b.showDate} ${b.showTime}`)
  })
}

export async function listAdminMatchOptions(): Promise<AdminMatchOptions> {
  const supabase = createSupabaseAdminClient()
  const [{ data: theaterRows, error: theaterError }, { data: movieRows, error: movieError }] = await Promise.all([
    supabase.from('theaters').select('id, name, city').order('name', { ascending: true }).limit(500),
    supabase.from('movies').select('id, title, year').order('title', { ascending: true }).limit(1000),
  ])

  if (theaterError) throw new Error(theaterError.message)
  if (movieError) throw new Error(movieError.message)

  return {
    theaters: ((theaterRows ?? []) as TheaterRow[]).map((theater) => ({
      id: theater.id,
      label: theater.name,
      description: theater.city ?? undefined,
    })),
    movies: ((movieRows ?? []) as MovieRow[]).map((movie) => ({
      id: movie.id,
      label: movie.title,
      description: movie.year ? String(movie.year) : undefined,
    })),
  }
}

export async function listAdminMovies(): Promise<AdminMovie[]> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('movies')
    .select('id, title, original_title, year, kmdb_id, kmdb_movie_seq, poster_url, genre, director, nation, movie_details(synopsis, runtime_minutes, certification)')
    .order('title', { ascending: true })
    .limit(1000)

  if (error) throw new Error(error.message)

  return ((data ?? []) as unknown as (MovieRow & { movie_details: { synopsis?: string | null; runtime_minutes?: number | null; certification?: string | null } | null })[]).map((row) => {
    const details = Array.isArray(row.movie_details) ? row.movie_details[0] : row.movie_details
    return movieFromRow({ ...row, ...details })
  })
}

export async function updateAdminMovie(input: AdminMovieInput) {
  if (!input.id) throw new Error('수정할 영화 ID가 필요합니다.')
  const title = input.title.trim()

  if (!title) throw new Error('영화 제목은 필수입니다.')
  if (!Number.isInteger(input.year) || input.year < 1888 || input.year > 2100) {
    throw new Error('영화 연도는 1888년부터 2100년 사이의 정수여야 합니다.')
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('movies')
    .update({
      title,
      original_title: input.originalTitle?.trim() || null,
      year: input.year,
      kmdb_id: input.kmdbId?.trim() || null,
      kmdb_movie_seq: input.kmdbMovieSeq?.trim() || null,
      poster_url: input.posterUrl?.trim() || null,
      genre: input.genre ?? [],
      director: input.director ?? [],
      nation: input.nation?.trim() || null,
    })
    .eq('id', input.id)
    .select('id, title, original_title, year, kmdb_id, kmdb_movie_seq, poster_url, genre, director, nation')
    .single()

  if (error) throw new Error(error.message)

  const hasDetails = input.synopsis || input.runtimeMinutes || input.certification
  if (hasDetails) {
    await supabase.from('movie_details').upsert({
      movie_id: input.id,
      synopsis: input.synopsis?.trim() || null,
      runtime_minutes: input.runtimeMinutes ?? null,
      certification: input.certification?.trim() || null,
    }, { onConflict: 'movie_id' })
  }

  return movieFromRow(data as MovieRow)
}

export async function listAdminTheaters(): Promise<AdminTheater[]> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('theaters')
    .select('id, name, lat, lng, address, city, phone, website, instagram_url, screen_count, seat_count')
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)

  return ((data ?? []) as TheaterRow[]).map(theaterFromRow)
}

export async function createAdminTheater(input: AdminTheaterInput) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('theaters')
    .insert(theaterToRow(input))
    .select('id, name, lat, lng, address, city, phone, website, instagram_url, screen_count, seat_count')
    .single()

  if (error) throw new Error(error.message)

  return theaterFromRow(data as TheaterRow)
}

export async function updateAdminTheater(input: AdminTheaterInput) {
  if (!input.id) throw new Error('수정할 극장 ID가 필요합니다.')

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('theaters')
    .update(theaterToRow(input))
    .eq('id', input.id)
    .select('id, name, lat, lng, address, city, phone, website, instagram_url, screen_count, seat_count')
    .single()

  if (error) throw new Error(error.message)

  return theaterFromRow(data as TheaterRow)
}

export async function listAdminServiceShowtimes(theaterId?: string): Promise<AdminServiceShowtime[]> {
  const supabase = createSupabaseAdminClient()
  let query = supabase
    .from('showtimes')
    .select(`
      id,
      theater_id,
      movie_id,
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
      is_active,
      theaters(name),
      movies(title)
    `)
    .order('show_date', { ascending: true })
    .order('show_time', { ascending: true })
    .limit(200)

  if (theaterId) {
    query = query.eq('theater_id', theaterId)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)

  return ((data ?? []) as unknown as ShowtimeRow[]).map(serviceShowtimeFromRow)
}

export async function updateAdminServiceShowtime(input: AdminShowtimeInput) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('showtimes')
    .update(showtimeInputToRow(input))
    .eq('id', input.id)
    .select(`
      id,
      theater_id,
      movie_id,
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
      is_active,
      theaters(name),
      movies(title)
    `)
    .single()

  if (error) throw new Error(error.message)

  return serviceShowtimeFromRow(data as unknown as ShowtimeRow)
}

export async function updateCandidateStatuses(ids: string[], status: AdminShowtimeStatus) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('showtime_candidates')
    .update({ status })
    .in('id', ids)
    .select()

  if (error) throw new Error(error.message)

  return ((data ?? []) as CandidateRow[]).map(candidateFromRow)
}

export async function updateCandidateMatch(input: CandidateMatchPayload) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('showtime_candidates')
    .update({
      matched_theater_id: input.matchedTheaterId ?? null,
      matched_movie_id: input.matchedMovieId ?? null,
      status: 'needs_review',
    })
    .eq('id', input.candidateId)
    .select()
    .single()

  if (error) throw new Error(error.message)

  return candidateFromRow(data as CandidateRow)
}

export async function autoMatchShowtimeCandidates(ids?: string[]): Promise<CandidateAutoMatchResult> {
  const supabase = createSupabaseAdminClient()
  let query = supabase
    .from('showtime_candidates')
    .select('*')
    .neq('status', 'approved')
    .neq('status', 'rejected')

  if (ids?.length) {
    query = query.in('id', Array.from(new Set(ids)))
  }

  const [
    { data: candidateRows, error: candidateError },
    { data: theaterRows, error: theaterError },
    { data: movieRows, error: movieError },
  ] = await Promise.all([
    query,
    supabase.from('theaters').select('id, name'),
    supabase.from('movies').select('id, title'),
  ])

  if (candidateError) throw new Error(candidateError.message)
  if (theaterError) throw new Error(theaterError.message)
  if (movieError) throw new Error(movieError.message)

  const candidates = ((candidateRows ?? []) as CandidateRow[]).map(candidateFromRow)
  const theaters = (theaterRows ?? []) as TheaterRow[]
  const movies = (movieRows ?? []) as MovieRow[]
  const updated: CrawledShowtimeCandidate[] = []
  let matched = 0
  let needsReview = 0

  for (const candidate of candidates) {
    const theater = resolveTheater(candidate, theaters)
    const movie = resolveMovie(candidate, movies)
    const warnings = mergeWarnings(candidate.warnings, [
      theater ? undefined : `자동 극장 매칭 실패: ${candidate.theaterName}`,
      movie ? undefined : `자동 영화 매칭 실패: ${candidate.movieTitle}`,
    ])

    const { data, error } = await supabase
      .from('showtime_candidates')
      .update({
        matched_theater_id: theater?.id ?? null,
        matched_movie_id: movie?.id ?? null,
        warnings,
        status: theater && movie ? 'needs_review' : 'needs_review',
      })
      .eq('id', candidate.id)
      .select()
      .single()

    if (error) throw new Error(error.message)

    if (theater && movie) matched += 1
    else needsReview += 1

    updated.push(candidateFromRow(data as CandidateRow))
  }

  return { matched, needsReview, updated }
}

export async function createAdminMovie(input: AdminMovieInput) {
  const title = input.title.trim()
  const originalTitle = input.originalTitle?.trim()

  if (!title) {
    throw new Error('영화 제목은 필수입니다.')
  }

  if (!Number.isInteger(input.year) || input.year < 1888 || input.year > 2100) {
    throw new Error('영화 연도는 1888년부터 2100년 사이의 정수여야 합니다.')
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('movies')
    .insert({
      title,
      original_title: originalTitle || null,
      year: input.year,
      genre: input.genre ?? [],
      director: input.director ?? [],
      kmdb_id: input.kmdbId?.trim() || null,
      kmdb_movie_seq: input.kmdbMovieSeq?.trim() || null,
      poster_url: input.posterUrl?.trim() || null,
      nation: input.nation?.trim() || null,
    })
    .select('id, title, original_title, year, kmdb_id, kmdb_movie_seq, poster_url, genre, director, nation')
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('이미 등록된 영화 식별자가 있습니다.')
    }

    throw new Error(error.message)
  }

  const movie = data as MovieRow

  const hasDetails = input.synopsis || input.runtimeMinutes || input.certification
  if (hasDetails) {
    await supabase.from('movie_details').upsert({
      movie_id: movie.id,
      synopsis: input.synopsis?.trim() || null,
      runtime_minutes: input.runtimeMinutes ?? null,
      certification: input.certification?.trim() || null,
    }, { onConflict: 'movie_id' })
  }

  return {
    id: movie.id,
    label: movie.title,
    description: movie.year ? String(movie.year) : undefined,
  }
}

export async function importAdminExternalMovie(input: AdminExternalMovie) {
  const supabase = createSupabaseAdminClient()
  const movieRow = {
    title: input.title,
    original_title: input.originalTitle ?? null,
    year: input.year,
    kmdb_id: input.movieId,
    kmdb_movie_seq: input.movieSeq,
    poster_url: input.posterUrl ?? null,
    genre: input.genre,
    director: input.director,
    nation: input.nation ?? null,
  }

  const { data: existing, error: existingError } = await supabase
    .from('movies')
    .select('id')
    .eq('kmdb_id', input.movieId)
    .eq('kmdb_movie_seq', input.movieSeq)
    .maybeSingle()

  if (existingError) throw new Error(existingError.message)

  const query = existing
    ? supabase.from('movies').update(movieRow).eq('id', (existing as { id: string }).id)
    : supabase.from('movies').insert(movieRow)
  const { data, error } = await query
    .select('id, title, year, kmdb_id, kmdb_movie_seq')
    .single()

  if (error) throw new Error(error.message)

  const movie = data as MovieRow

  const hasDetails = input.synopsis || input.runtimeMinutes || input.certification
  if (hasDetails) {
    await supabase.from('movie_details').upsert({
      movie_id: movie.id,
      synopsis: input.synopsis ?? null,
      runtime_minutes: input.runtimeMinutes ?? null,
      certification: input.certification ?? null,
    }, { onConflict: 'movie_id' })
  }

  return {
    id: movie.id,
    label: movie.title,
    description: movie.year ? `KMDB ${movie.kmdb_id ?? ''}${movie.kmdb_movie_seq ?? ''} · ${movie.year}` : `KMDB ${movie.kmdb_id ?? ''}${movie.kmdb_movie_seq ?? ''}`,
  }
}

export async function approveShowtimeCandidates(
  ids: string[],
  approvedBy: string,
): Promise<ShowtimeApprovalResult> {
  const supabase = createSupabaseAdminClient()
  const uniqueIds = Array.from(new Set(ids))

  if (uniqueIds.length === 0) {
    return { approved: [], failed: [] }
  }

  const { data: candidateRows, error: candidateError } = await supabase
    .from('showtime_candidates')
    .select('*')
    .in('id', uniqueIds)

  if (candidateError) throw new Error(candidateError.message)

  const candidates = ((candidateRows ?? []) as CandidateRow[]).map(candidateFromRow)
  const missingIds = uniqueIds.filter((id) => !candidates.some((candidate) => candidate.id === id))
  const result: ShowtimeApprovalResult = {
    approved: [],
    failed: missingIds.map((candidateId) => ({ candidateId, reason: '후보 레코드를 찾을 수 없습니다.' })),
  }

  const [{ data: theaterRows, error: theaterError }, { data: movieRows, error: movieError }] = await Promise.all([
    supabase.from('theaters').select('id, name'),
    supabase.from('movies').select('id, title, kmdb_id, kmdb_movie_seq'),
  ])

  if (theaterError) throw new Error(theaterError.message)
  if (movieError) throw new Error(movieError.message)

  const theaters = (theaterRows ?? []) as TheaterRow[]
  const movies = (movieRows ?? []) as MovieRow[]

  for (const candidate of candidates) {
    const theater = resolveTheater(candidate, theaters)
    const movieResult = await resolveMovieForApproval(candidate, movies)
    const movie = movieResult.movie

    if (!theater || !movie) {
      result.failed.push({
        candidateId: candidate.id,
        reason: [
          theater ? null : `극장 매칭 실패: ${candidate.theaterName}`,
          movie ? null : movieResult.reason,
        ].filter(Boolean).join(' / '),
      })
      continue
    }

    const showtime = showtimeRowFromCandidate(candidate, theater.id, movie.id)
    const { data: upserted, error: upsertError } = await supabase
      .from('showtimes')
      .upsert(showtime, {
        onConflict: 'theater_id,movie_id,show_date,show_time,screen_name',
      })
      .select('id')
      .maybeSingle()

    if (upsertError) {
      result.failed.push({ candidateId: candidate.id, reason: upsertError.message })
      continue
    }

    const { error: updateError } = await supabase
      .from('showtime_candidates')
      .update({
        status: 'approved',
        matched_theater_id: theater.id,
        matched_movie_id: movie.id,
        approved_at: new Date().toISOString(),
        approved_by: approvedBy,
      })
      .eq('id', candidate.id)

    if (updateError) {
      if (isMissingUpdatedAtTriggerError(updateError.message)) {
        result.approved.push({
          candidateId: candidate.id,
          showtimeId: (upserted as { id?: string } | null)?.id,
        })
        continue
      }

      result.failed.push({ candidateId: candidate.id, reason: updateError.message })
      continue
    }

    result.approved.push({
      candidateId: candidate.id,
      showtimeId: (upserted as { id?: string } | null)?.id,
    })
  }

  return result
}

function sourceFromRow(row: CrawlSourceRow): AdminTheaterSource {
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

function sourceToRow(source: AdminTheaterSource) {
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

function runFromRow(row: CrawlRunRow): CrawlRun {
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

function runToRow(run: CrawlRun) {
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

function candidateFromRow(row: CandidateRow): CrawledShowtimeCandidate {
  return {
    id: row.id,
    sourceId: row.source_id,
    theaterId: row.theater_id,
    theaterName: row.theater_name,
    movieTitle: row.movie_title,
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

function candidateToRow(candidate: CrawledShowtimeCandidate, matchedTheaterId?: string) {
  return {
    id: candidate.id,
    source_id: candidate.sourceId,
    theater_id: candidate.theaterId,
    theater_name: candidate.theaterName,
    movie_title: candidate.movieTitle,
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

function theaterFromRow(row: TheaterRow): AdminTheater {
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

function normalizeInstagramUrl(value?: string): string | null {
  const raw = value?.trim()
  if (!raw) return null
  // 이미 URL 형태면 username만 추출
  const fromUrl = raw.match(/instagram\.com\/([^/?#\s]+)/)?.[1]
  const username = fromUrl ?? raw.replace(/^@/, '')
  if (!username) return null
  return `https://www.instagram.com/${username}/`
}

function theaterToRow(input: AdminTheaterInput) {
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

function movieFromRow(row: MovieRow): AdminMovie {
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

function serviceShowtimeFromRow(row: ShowtimeRow): AdminServiceShowtime {
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

function showtimeInputToRow(input: AdminShowtimeInput) {
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

function resolveTheater(candidate: CrawledShowtimeCandidate, theaters: TheaterRow[]) {
  if (candidate.matchedTheaterId) {
    const matched = theaters.find((theater) => theater.id === candidate.matchedTheaterId)
    if (matched) return matched
  }

  const exact = theaters.find((theater) => theater.name.trim() === candidate.theaterName.trim())
  if (exact) return exact

  const normalizedName = normalizeMatchText(candidate.theaterName)
  return theaters.find((theater) => normalizeMatchText(theater.name) === normalizedName)
}

function resolveMovie(candidate: CrawledShowtimeCandidate, movies: MovieRow[]) {
  if (candidate.matchedMovieId) {
    const matched = movies.find((movie) => movie.id === candidate.matchedMovieId)
    if (matched) return matched
  }

  return resolveMovieByTitle(candidate.movieTitle, movies)
}

async function resolveMovieForApproval(candidate: CrawledShowtimeCandidate, movies: MovieRow[]) {
  const localMovie = resolveMovie(candidate, movies)
  if (localMovie) return { movie: localMovie }

  const titles = candidateMovieTitleCandidates(candidate.movieTitle)
  for (const title of titles) {
    const localByCleanTitle = resolveMovieByTitle(title, movies)
    if (localByCleanTitle) return { movie: localByCleanTitle }
  }

  try {
    for (const title of titles) {
      const externalMovies = await searchKmdbMovies(title)
      const externalMovie = pickExactExternalMovie(title, externalMovies)
      if (!externalMovie) continue

      const imported = await importAdminExternalMovie(externalMovie)
      const movie = {
        id: imported.id,
        title: imported.label,
        kmdb_id: externalMovie.movieId,
        kmdb_movie_seq: externalMovie.movieSeq,
      }
      movies.push(movie)
      return { movie }
    }
  } catch (error) {
    return {
      movie: undefined,
      reason: `KMDB 자동 매칭 실패: ${candidate.movieTitle} (${error instanceof Error ? error.message : '알 수 없는 오류'})`,
    }
  }

  return { movie: undefined, reason: `영화 매칭 실패: ${candidate.movieTitle}` }
}

function resolveMovieByTitle(title: string, movies: MovieRow[]) {
  const exact = movies.find((movie) => movie.title.trim() === title.trim())
  if (exact) return exact

  const normalizedTitle = normalizeMatchText(title)
  return movies.find((movie) => normalizeMatchText(movie.title) === normalizedTitle)
}

function candidateMovieTitleCandidates(title: string) {
  return Array.from(new Set([
    title.trim(),
    title.trim().replace(/\s+(?:\d{1,2}[./-]\d{1,2})(?:\s.*)?$/, '').trim(),
    title.trim().replace(/\s+(?:\d{1,2}월\s*\d{1,2}일)(?:\s.*)?$/, '').trim(),
  ].filter(Boolean)))
}

function pickExactExternalMovie(title: string, movies: AdminExternalMovie[]) {
  const normalizedTitle = normalizeMatchText(title)
  return movies.find((movie) =>
    normalizeMatchText(movie.title) === normalizedTitle ||
    (movie.originalTitle ? normalizeMatchText(movie.originalTitle) === normalizedTitle : false),
  )
}

function showtimeRowFromCandidate(
  candidate: CrawledShowtimeCandidate,
  theaterId: string,
  movieId: string,
): ShowtimeRow {
  return {
    theater_id: theaterId,
    movie_id: movieId,
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
    is_active: true,
  }
}

function normalizeMatchText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\s"'‘’“”()[\]{}:;,.!?·ㆍ・_-]+/g, '')
}

function isMissingUpdatedAtTriggerError(message: string) {
  return message.includes('record "new" has no field "updated_at"')
}

function mergeWarnings(current: string[], next: Array<string | undefined>) {
  const filteredCurrent = current.filter(
    (warning) => !warning.startsWith('자동 극장 매칭 실패:') && !warning.startsWith('자동 영화 매칭 실패:'),
  )

  return Array.from(new Set([...filteredCurrent, ...next.filter((warning): warning is string => Boolean(warning))]))
}

function scoreStatus(status: AdminShowtimeStatus) {
  if (status === 'needs_review') return 0
  if (status === 'draft') return 1
  if (status === 'approved') return 2
  return 3
}

function slugify(value: string) {
  const romanized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return romanized || `source-${Date.now().toString(36)}`
}

function originFromUrl(value: string) {
  try {
    return new URL(value).origin
  } catch {
    return value
  }
}

function normalizeTime(value: string) {
  return value.slice(0, 5)
}
