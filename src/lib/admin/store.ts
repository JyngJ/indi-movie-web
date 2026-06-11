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
  ShowtimeSeatUpdateInput,
} from '@/types/admin'
import { searchKmdbMovies } from '@/lib/admin/kmdb'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import {
  candidateFromRow,
  candidateToRow,
  movieFromRow,
  normalizeInstagramUrl,
  normalizeTime,
  runFromRow,
  runToRow,
  serviceShowtimeFromRow,
  showtimeInputToRow,
  sourceFromRow,
  sourceToRow,
  theaterFromRow,
  theaterToRow,
  type CandidateRow,
  type CrawlRunRow,
  type CrawlSourceRow,
  type MovieRow,
  type ShowtimeRow,
  type TheaterRow,
} from './store/converters'

/* ── 감독 프로필 자동 수집 (Wikipedia) ──────────────────────────── */
const FILM_KEYWORDS = [
  '영화 감독', '감독', '영화인', '시나리오', '각본', '다큐멘터리',
  'director', 'filmmaker', 'film', 'cinema', '연출', '촬영감독',
]

async function fetchWikipediaBio(name: string): Promise<{ bio?: string; photoUrl?: string }> {
  try {
    const res = await fetch(
      `https://ko.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`,
      { headers: { 'User-Agent': 'indi-movie-app/1.0' } },
    )
    if (!res.ok) return {}
    const json = await res.json() as {
      extract?: string; thumbnail?: { source?: string }
      type?: string; description?: string
    }
    if (json.type === 'disambiguation') return {}
    const combined = ((json.extract ?? '') + ' ' + (json.description ?? '')).toLowerCase()
    if (!FILM_KEYWORDS.some(kw => combined.includes(kw.toLowerCase()))) return {}
    return {
      bio: json.extract?.split('\n')[0]?.slice(0, 400) || undefined,
      photoUrl: json.thumbnail?.source || undefined,
    }
  } catch { return {} }
}

async function ensureDirectorProfiles(directors: string[]): Promise<void> {
  if (!directors.length) return
  const supabase = createSupabaseAdminClient()
  try {
    const { data: existing } = await supabase
      .from('directors').select('name').in('name', directors)
    const existingSet = new Set((existing ?? []).map((r: { name: string }) => r.name))
    const missing = directors.filter(d => !existingSet.has(d))
    for (const name of missing) {
      const { bio, photoUrl } = await fetchWikipediaBio(name)
      await supabase.from('directors').upsert({
        name,
        photo_url: photoUrl ?? null,
        bio: bio ?? null,
        source: bio || photoUrl ? 'wikipedia' : 'none',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'name' })
      await new Promise(r => setTimeout(r, 300))
    }
  } catch (e) {
    console.error('[ensureDirectorProfiles] 실패:', (e as Error).message)
  }
}

interface MovieResolutionResult {
  movie?: MovieRow
  reason?: string
}

type ProviderMovieAliases = Map<string, string>

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

export async function updateAdminSource(sourceId: string, input: AdminTheaterSourceInput) {
  const normalizedSourceId = sourceId.trim()
  const theaterName = input.theaterName.trim()
  const listingUrl = input.listingUrl.trim()
  const homepageUrl = input.homepageUrl.trim() || originFromUrl(listingUrl)

  if (!normalizedSourceId) throw new Error('수정할 크롤링 소스 ID가 필요합니다.')
  if (!theaterName || !listingUrl) {
    throw new Error('극장명과 상영시간표 URL은 필수입니다.')
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('crawl_sources')
    .update({
      theater_id: slugify(theaterName),
      theater_name: theaterName,
      matched_theater_id: input.matchedTheaterId?.trim() || null,
      homepage_url: homepageUrl,
      listing_url: listingUrl,
      parser: input.parser,
      cadence: input.cadence,
      notes: input.notes?.trim() || null,
    })
    .eq('id', normalizedSourceId)
    .select()
    .single()

  if (error) throw new Error(error.message)

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

export async function listCrawlRuns(limit = 20) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('crawl_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)

  return ((data ?? []) as CrawlRunRow[]).map(runFromRow)
}

export async function listReviewCandidates(status?: AdminShowtimeStatus, offset: number = 0, limit: number = 1000) {
  const supabase = createSupabaseAdminClient()

  let query = supabase
    .from('showtime_candidates')
    .select('*')
    .neq('status', 'rejected')
    .neq('status', 'approved')
    .order('show_date', { ascending: true })
    .order('show_time', { ascending: true })

  if (status) {
    query = query.eq('status', status)
  }

  const { data: candidates, error } = await query

  if (error) throw new Error(error.message)

  // 기존 showtimes 조회 (극장, 영화, 날짜, 시간으로 중복 감지)
  const { data: showtimes, error: showError } = await supabase
    .from('showtimes')
    .select('theater_id, movie_id, screen_name, show_date, show_time, is_active')
    .eq('is_active', true)

  if (showError) throw new Error(showError.message)

  // 모든 영화 제목 조회 (캐싱)
  const { data: movies, error: movieError } = await supabase
    .from('movies')
    .select('id, title')

  if (movieError) throw new Error(movieError.message)

  const movieTitleById = new Map<string, string>()
  movies?.forEach((movie: { id: string; title: string }) => {
    movieTitleById.set(movie.id, movie.title)
  })

  // showtimes를 Map으로 구성: "theater_id|movie_title|screen|date|time"
  const existingShowtimes = new Map<string, true>()
  showtimes?.forEach((st) => {
    const movieTitle = movieTitleById.get(st.movie_id) || ''
    const key = `${st.theater_id}|${movieTitle}|${st.screen_name}|${st.show_date}|${st.show_time}`
    existingShowtimes.set(key, true)
  })

  // candidates 중복 제거: 이미 showtimes에 있는 것은 필터링
  const filtered = ((candidates ?? []) as CandidateRow[]).filter((candidate) => {
    const key = `${candidate.theater_id}|${candidate.movie_title}|${candidate.screen_name}|${candidate.show_date}|${candidate.show_time}`
    return !existingShowtimes.has(key)
  })

  // 페이지네이션 적용
  const paginated = filtered.slice(offset, offset + limit)

  return paginated.map(candidateFromRow).sort((a, b) => {
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

export async function searchLocalMovies(query: string): Promise<AdminExternalMovie[]> {
  const q = query.trim()
  if (!q) return []

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('movies')
    .select('id, title, original_title, year, kmdb_id, kmdb_movie_seq, poster_url, genre, director, nation')
    .ilike('title', `%${q}%`)
    .order('title', { ascending: true })
    .limit(20)

  if (error) throw new Error(error.message)

  return ((data ?? []) as MovieRow[]).map((row) => ({
    provider: 'local' as const,
    externalId: `local:${row.id}`,
    movieId: row.kmdb_id ?? '',
    movieSeq: row.kmdb_movie_seq ?? '',
    localId: row.id,
    title: row.title,
    originalTitle: row.original_title ?? undefined,
    year: row.year ?? new Date().getFullYear(),
    genre: [],
    director: Array.isArray(row.director) ? (row.director as string[]) : [],
    nation: row.nation ?? undefined,
    posterUrl: row.poster_url ?? undefined,
  }))
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

export async function updateShowtimeSeatsOnly(theaterId: string, updates: ShowtimeSeatUpdateInput[]) {
  const supabase = createSupabaseAdminClient()

  const results = await Promise.all(
    updates.map(async (update) => {
      const { error } = await supabase
        .from('showtimes')
        .update({
          seat_available: update.seatAvailable,
          seat_total: update.seatTotal,
        })
        .eq('id', update.id)
        .eq('theater_id', theaterId)

      if (error) throw new Error(`${update.id}: ${error.message}`)
    }),
  )

  return { updated: updates.length }
}

export async function deleteCandidates(ids: string[]) {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('showtime_candidates')
    .delete()
    .in('id', ids)

  if (error) throw new Error(error.message)
}

export async function deleteExpiredCandidates() {
  const supabase = createSupabaseAdminClient()
  const today = new Date().toISOString().slice(0, 10)
  const { count, error } = await supabase
    .from('showtime_candidates')
    .delete({ count: 'exact' })
    .lt('show_date', today)
    .neq('status', 'approved')
  if (error) throw new Error(error.message)
  return { deleted: count ?? 0 }
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

async function fetchAutoMatchInputs(supabase: ReturnType<typeof createSupabaseAdminClient>, ids?: string[]) {
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
    { data: aliasRows, error: aliasError },
  ] = await Promise.all([
    query,
    supabase.from('theaters').select('id, name'),
    supabase.from('movies').select('id, title, original_title, year, kmdb_id, kmdb_movie_seq'),
    supabase
      .from('showtime_candidates')
      .select('raw_text, matched_movie_id')
      .not('matched_movie_id', 'is', null),
  ])

  if (candidateError) throw new Error(candidateError.message)
  if (theaterError) throw new Error(theaterError.message)
  if (movieError) throw new Error(movieError.message)
  if (aliasError) throw new Error(aliasError.message)

  return {
    candidates: ((candidateRows ?? []) as CandidateRow[]).map(candidateFromRow),
    theaters: (theaterRows ?? []) as TheaterRow[],
    movies: (movieRows ?? []) as MovieRow[],
    providerMovieAliases: buildProviderMovieAliases((aliasRows ?? []) as Pick<CandidateRow, 'raw_text' | 'matched_movie_id'>[]),
  }
}

export async function autoMatchShowtimeCandidates(ids?: string[]): Promise<CandidateAutoMatchResult> {
  const supabase = createSupabaseAdminClient()
  const { candidates, theaters, movies, providerMovieAliases } = await fetchAutoMatchInputs(supabase, ids)

  const updated: CrawledShowtimeCandidate[] = []
  const movieResolutionCache = new Map<string, MovieResolutionResult>()
  let matched = 0
  let autoApproved = 0
  let needsReview = 0

  for (const candidate of candidates) {
    const theater = resolveTheater(candidate, theaters)
    const movieResult = await resolveMovieForApproval(candidate, movies, movieResolutionCache, providerMovieAliases)
    const movie = movieResult.movie
    const warnings = mergeWarnings(candidate.warnings, [
      theater ? undefined : `자동 극장 매칭 실패: ${candidate.theaterName}`,
      movie ? undefined : movieResult.reason ?? `자동 영화 매칭 실패: ${candidate.movieTitle}`,
    ])

    // 자동 승인 기준: theater + movie 둘 다 매칭 + confidence >= 0.9 + warnings 없음
    const canAutoApprove = Boolean(theater && movie && candidate.confidence >= 0.9 && warnings.length === 0)
    const newStatus = canAutoApprove ? 'approved' : 'needs_review'

    const { data, error } = await supabase
      .from('showtime_candidates')
      .update({
        matched_theater_id: theater?.id ?? null,
        matched_movie_id: movie?.id ?? null,
        warnings,
        status: newStatus,
      })
      .eq('id', candidate.id)
      .select()
      .single()

    if (error) {
      needsReview += 1
      continue
    }

    if (canAutoApprove && theater && movie) {
      // showtimes 테이블에 바로 삽입
      await supabase
        .from('showtimes')
        .upsert(showtimeRowFromCandidate(candidate, theater.id, movie.id), {
          onConflict: 'theater_id,movie_id,show_date,show_time,screen_name',
        })
      autoApproved += 1
    } else if (theater && movie) {
      matched += 1
    } else {
      needsReview += 1
    }
    rememberProviderMovieAlias(candidate, movie, providerMovieAliases)

    updated.push(candidateFromRow(data as CandidateRow))
  }

  return { matched, autoApproved, needsReview, updated }
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

  const directors = (input.director ?? []).filter(Boolean)
  void ensureDirectorProfiles(directors)

  return {
    id: movie.id,
    label: movie.title,
    description: movie.year ? String(movie.year) : undefined,
  }
}

export async function importAdminExternalMovie(input: AdminExternalMovie) {
  const supabase = createSupabaseAdminClient()
  const isCine21 = input.provider === 'cine21'
  const movieRow = {
    title: input.title,
    original_title: input.originalTitle ?? null,
    year: input.year,
    kmdb_id: isCine21 ? null : input.movieId,
    kmdb_movie_seq: isCine21 ? null : input.movieSeq,
    poster_url: input.posterUrl ?? null,
    genre: input.genre,
    director: input.director,
    nation: input.nation ?? null,
  }

  // cine21은 제목+연도로 중복 확인
  let existing: { id: string } | null = null
  let existingError: { message: string } | null = null
  if (isCine21) {
    const res = await supabase.from('movies').select('id').eq('title', input.title).maybeSingle()
    existing = res.data as { id: string } | null
    existingError = res.error
  } else {
    const res = await supabase.from('movies').select('id').eq('kmdb_id', input.movieId).eq('kmdb_movie_seq', input.movieSeq).maybeSingle()
    existing = res.data as { id: string } | null
    existingError = res.error
  }

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
    const detailsRow: {
      movie_id: string
      synopsis?: string | null
      runtime_minutes?: number | null
      certification?: string | null
    } = {
      movie_id: movie.id,
    }
    if (input.synopsis) detailsRow.synopsis = input.synopsis
    if (input.runtimeMinutes) detailsRow.runtime_minutes = input.runtimeMinutes
    if (input.certification) detailsRow.certification = input.certification
    await supabase.from('movie_details').upsert(detailsRow, { onConflict: 'movie_id' })
  }

  void ensureDirectorProfiles(input.director ?? [])

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

  const [
    { data: theaterRows, error: theaterError },
    { data: movieRows, error: movieError },
    { data: aliasRows, error: aliasError },
  ] = await Promise.all([
    supabase.from('theaters').select('id, name'),
    supabase.from('movies').select('id, title, original_title, year, kmdb_id, kmdb_movie_seq'),
    supabase
      .from('showtime_candidates')
      .select('raw_text, matched_movie_id')
      .not('matched_movie_id', 'is', null),
  ])

  if (theaterError) throw new Error(theaterError.message)
  if (movieError) throw new Error(movieError.message)
  if (aliasError) throw new Error(aliasError.message)

  const theaters = (theaterRows ?? []) as TheaterRow[]
  const movies = (movieRows ?? []) as MovieRow[]
  const movieResolutionCache = new Map<string, MovieResolutionResult>()
  const providerMovieAliases = buildProviderMovieAliases((aliasRows ?? []) as Pick<CandidateRow, 'raw_text' | 'matched_movie_id'>[])

  for (const candidate of candidates) {
    const theater = resolveTheater(candidate, theaters)
    const movieResult = await resolveMovieForApproval(candidate, movies, movieResolutionCache, providerMovieAliases)
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
    rememberProviderMovieAlias(candidate, movie, providerMovieAliases)
  }

  return result
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

function resolveMovie(candidate: CrawledShowtimeCandidate, movies: MovieRow[], providerMovieAliases?: ProviderMovieAliases) {
  if (candidate.matchedMovieId) {
    const matched = movies.find((movie) => movie.id === candidate.matchedMovieId)
    if (matched) return matched
  }

  const providerMovieId = resolveProviderMovieAlias(candidate, movies, providerMovieAliases)
  if (providerMovieId) return providerMovieId

  for (const title of candidateMovieTitleCandidates(candidate.movieTitle)) {
    const movie = resolveMovieByTitle(title, movies)
    if (movie) return movie
  }
  return null
}

async function resolveMovieForApproval(
  candidate: CrawledShowtimeCandidate,
  movies: MovieRow[],
  cache?: Map<string, MovieResolutionResult>,
  providerMovieAliases?: ProviderMovieAliases,
): Promise<MovieResolutionResult> {
  const localMovie = resolveMovie(candidate, movies, providerMovieAliases)
  if (localMovie) return { movie: localMovie }

  const titles = candidateMovieTitleCandidates(candidate.movieTitle)
  for (const title of titles) {
    const localByCleanTitle = resolveMovieByTitle(title, movies)
    if (localByCleanTitle) return { movie: localByCleanTitle }
  }

  const cacheKey = movieResolutionCacheKey(titles)
  const cached = cache?.get(cacheKey)
  if (cached) return cached

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
      const result = { movie }
      cache?.set(cacheKey, result)
      rememberProviderMovieAlias(candidate, movie, providerMovieAliases)
      return result
    }
  } catch {
    // KMDB 실패 (키 없음 포함) → 씨네21 fallback으로 계속
  }

  // KMDB에 없으면 씨네21에서 검색 후 자동 임포트
  try {
    for (const title of titles) {
      const cine21Movie = await searchAndImportCine21(title, createSupabaseAdminClient())
      if (!cine21Movie) continue
      movies.push(cine21Movie)
      const result = { movie: cine21Movie }
      cache?.set(cacheKey, result)
      rememberProviderMovieAlias(candidate, cine21Movie, providerMovieAliases)
      return result
    }
  } catch {
    // 씨네21 실패는 무시
  }

  const result = { movie: undefined, reason: `영화 매칭 실패: ${candidate.movieTitle}` }
  cache?.set(cacheKey, result)
  return result
}

function resolveMovieByTitle(title: string, movies: MovieRow[]) {
  const exact = movies.find((movie) => movie.title.trim() === title.trim())
  if (exact) return exact

  const normalizedTitle = normalizeMatchText(title)
  const looseTitle = normalizeLooseMovieTitle(title)

  return movies.find((movie) =>
    normalizeMatchText(movie.title) === normalizedTitle ||
    (movie.original_title ? normalizeMatchText(movie.original_title) === normalizedTitle : false) ||
    normalizeLooseMovieTitle(movie.title) === looseTitle ||
    (movie.original_title ? normalizeLooseMovieTitle(movie.original_title) === looseTitle : false),
  )
}

function buildProviderMovieAliases(rows: Array<Pick<CandidateRow, 'raw_text' | 'matched_movie_id'>>) {
  const aliases: ProviderMovieAliases = new Map()

  for (const row of rows) {
    if (!row.matched_movie_id) continue
    const key = extractProviderMovieKey(row.raw_text)
    if (key) aliases.set(key, row.matched_movie_id)
  }

  return aliases
}

function resolveProviderMovieAlias(
  candidate: CrawledShowtimeCandidate,
  movies: MovieRow[],
  aliases?: ProviderMovieAliases,
) {
  const key = extractProviderMovieKey(candidate.rawText)
  const movieId = key ? aliases?.get(key) : undefined
  return movieId ? movies.find((movie) => movie.id === movieId) : undefined
}

function rememberProviderMovieAlias(
  candidate: CrawledShowtimeCandidate,
  movie: MovieRow | undefined,
  aliases?: ProviderMovieAliases,
) {
  if (!movie?.id || !aliases) return
  const key = extractProviderMovieKey(candidate.rawText)
  if (key) aliases.set(key, movie.id)
}

function extractProviderMovieKey(rawText: string) {
  try {
    const raw = JSON.parse(rawText) as {
      MovieCd?: unknown
      M_ID?: unknown
    }
    if (raw.MovieCd) return `dtryx:${String(raw.MovieCd)}`
    if (raw.M_ID) return `moviee:${String(raw.M_ID)}`
  } catch {
    return undefined
  }
}

function candidateMovieTitleCandidates(title: string) {
  const base = title.trim()
  const decoratedBase = stripMovieTitleDecorations(base)

  // "영화 + 시네토크" / "영화 + GV" → + 앞부분만
  const beforePlus = base.split(/\s*\+\s*/)[0].trim()
  // 더블 피처 분리: "A + B" → A, B 각각
  const plusParts = base.split(/\s*\+\s*/).map(s => s.trim()).filter(Boolean)

  // "영화 with 감독이름" / "영화 with Q&A" → with 앞부분만
  const beforeWith = base.replace(/\s+with\b.*/i, '').trim()

  // "만춘 (1949)" → "만춘"  (제목 뒤 연도 괄호 제거)
  const withoutYear = base.replace(/\s*\(\d{4}\)\s*$/, '').trim()
  // "영화제목_기획전명" → "영화제목"  (_ 이후 제거)
  const beforeUnderscore = base.split('_')[0].trim()
  const beforeDashEvent = base.replace(/\s*[-–—]\s*(?:GV|시네토크|씨네토크|관객과의\s*대화|무대인사|해설|강연).*$/i, '').trim()
  const knownProgramTitle = stripKnownProgramPrefix(decoratedBase)
  const slashParts = base.split(/\s*\/\s*/).map(s => s.trim()).filter(Boolean)
  // 미지의 괄호 내용 포함한 모든 trailing 괄호 제거: "마더(고려극장기획)" → "마더"
  const beforeAnyParen = base.includes('(') ? base.replace(/\s*\(.*$/, '').trim() : base

  const variants = [
    base,
    decoratedBase !== base ? decoratedBase : undefined,
    // + 앞부분 (시네토크, GV 등 부가 행사 제거)
    beforePlus !== base ? beforePlus : undefined,
    beforePlus !== base ? stripMovieTitleDecorations(beforePlus) : undefined,
    // with 앞부분
    beforeWith !== base ? beforeWith : undefined,
    beforeWith !== base ? stripMovieTitleDecorations(beforeWith) : undefined,
    // 연도 괄호 제거
    withoutYear !== base ? withoutYear : undefined,
    // _ 이후 제거
    beforeUnderscore !== base ? beforeUnderscore : undefined,
    beforeUnderscore !== base ? stripMovieTitleDecorations(beforeUnderscore) : undefined,
    // 행사 설명 제거
    beforeDashEvent !== base ? stripMovieTitleDecorations(beforeDashEvent) : undefined,
    // 알려진 프로그램 접두어 제거
    knownProgramTitle !== decoratedBase ? knownProgramTitle : undefined,
    // 날짜 패턴 제거 (05/15, 5월 15일)
    base.replace(/\s+(?:\d{1,2}[./-]\d{1,2})(?:\s.*)?$/, '').trim(),
    base.replace(/\s+(?:\d{1,2}월\s*\d{1,2}일)(?:\s.*)?$/, '').trim(),
    // 파트 표시 제거 (1부, 2부, 상, 하)
    base.replace(/\s+(?:\d+,\s*\d+부|\d+부|상편|하편|[상하])\s*$/, '').trim(),
    base.replace(/,?\s*\d+[,\s]*\d*부?\s*$/, '').trim(),
    // 미지의 괄호 내용 포함 trailing 괄호 전체 제거
    beforeAnyParen !== base && beforeAnyParen !== decoratedBase ? beforeAnyParen : undefined,
    beforeAnyParen !== base && beforeAnyParen !== decoratedBase ? stripMovieTitleDecorations(beforeAnyParen) : undefined,
    // 더블 피처: + 앞/뒤 각 영화 제목
    ...(plusParts.length > 1 ? plusParts.flatMap((part) => [part, stripMovieTitleDecorations(part)]) : []),
    // 단편 묶음: 각 작품 제목도 후보로 둔다.
    ...(slashParts.length > 1 && slashParts.length <= 5 ? slashParts.flatMap((part) => [part, stripMovieTitleDecorations(part)]) : []),
  ]
  return Array.from(new Set(variants.filter((v): v is string => Boolean(v))))
}

function pickExactExternalMovie(title: string, movies: AdminExternalMovie[]) {
  const normalizedTitle = normalizeMatchText(title)
  const looseTitle = normalizeLooseMovieTitle(title)
  // 1순위: 정규화 exact match
  const exact = movies.find((movie) =>
    normalizeMatchText(movie.title) === normalizedTitle ||
    (movie.originalTitle ? normalizeMatchText(movie.originalTitle) === normalizedTitle : false) ||
    normalizeLooseMovieTitle(movie.title) === looseTitle ||
    (movie.originalTitle ? normalizeLooseMovieTitle(movie.originalTitle) === looseTitle : false),
  )
  if (exact) return exact

  // 2순위: 띄어쓰기/조사 차이 정도의 근접 제목만 허용한다.
  const fuzzy = movies.find((movie) => {
    const candidates = [movie.title, movie.originalTitle].filter((value): value is string => Boolean(value))
    return candidates.some((candidate) => {
      const current = normalizeLooseMovieTitle(candidate)
      return current.length >= 6 && looseTitle.length >= 6 && titleSimilarity(current, looseTitle) >= 0.88
    })
  })
  if (fuzzy) return fuzzy

  // 3순위: 충분히 긴 검색어에 한해 부분 일치. 짧은 제목은 오매칭 위험이 커서 제외한다.
  if (normalizedTitle.length < 5) return undefined
  return movies.find((movie) => {
    const t = normalizeMatchText(movie.title)
    const original = movie.originalTitle ? normalizeMatchText(movie.originalTitle) : ''
    return t.includes(normalizedTitle) ||
      normalizedTitle.includes(t) ||
      (original.length >= 5 && (original.includes(normalizedTitle) || normalizedTitle.includes(original)))
  })
}

function movieResolutionCacheKey(titles: string[]) {
  return titles.map(normalizeLooseMovieTitle).filter(Boolean).join('|')
}

async function searchAndImportCine21(
  title: string,
  supabase: ReturnType<typeof createSupabaseAdminClient>,
): Promise<{ id: string; title: string; kmdb_id: string; kmdb_movie_seq: string } | null> {
  const cleanText = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

  // 씨네21 검색
  const searchRes = await fetch(
    `https://cine21.com/search/result/?q=${encodeURIComponent(title)}`,
    { headers: { 'user-agent': 'indi-movie-web-admin-crawler/0.1' }, signal: AbortSignal.timeout(8000) },
  )
  const searchHtml = await searchRes.text()
  const movieIds = [...searchHtml.matchAll(/movie_id=(\d+)/g)].map(m => m[1])
  const movieId = movieIds[0]
  if (!movieId) return null

  // 상세 페이지
  const detailRes = await fetch(
    `https://cine21.com/movie/info/?movie_id=${movieId}`,
    { headers: { 'user-agent': 'indi-movie-web-admin-crawler/0.1' }, signal: AbortSignal.timeout(8000) },
  )
  const html = await detailRes.text()

  const parsedTitle = html.match(/영화 \[(.+?)\]/)?.[1]?.trim()
  if (!parsedTitle) return null

  // 이름 정규화 비교
  const normalize = (s: string) => s.replace(/\s+/g, '').toLowerCase()
  if (!normalize(parsedTitle).includes(normalize(title)) && !normalize(title).includes(normalize(parsedTitle))) return null

  const directors = [...html.matchAll(/감독<\/p>[\s\S]{0,400}?<a[^>]+>([^<]+)<\/a>/g)]
    .map(m => m[1].trim()).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i)
  const genreBlock = html.match(/장르<\/p>\s*([\s\S]{0,200}?)<\/li>/)?.[1] ?? ''
  const genres = cleanText(genreBlock).split(/[,，]/).map(s => s.trim()).filter(Boolean)
  const nationBlock = html.match(/국가<\/p>\s*([\s\S]{0,100}?)<\/li>/)?.[1] ?? ''
  const nations = cleanText(nationBlock).split(/[,，]/).map(s => s.trim()).filter(Boolean)
  const yearMatch = html.match(/제작연도[\s\S]{0,50}?(\d{4})/)
  const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear()

  const { data: existing } = await supabase.from('movies').select('id, title').eq('title', parsedTitle).maybeSingle()
  if (existing) return { id: existing.id as string, title: parsedTitle, kmdb_id: '', kmdb_movie_seq: '' }

  const { data, error } = await supabase.from('movies').insert({
    title: parsedTitle,
    director: directors,
    genre: genres,
    nation: nations[0] ?? null,
    year,
  }).select('id').single()
  if (error || !data) return null

  return { id: data.id as string, title: parsedTitle, kmdb_id: '', kmdb_movie_seq: '' }
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

function normalizeLooseMovieTitle(value: string) {
  return normalizeMatchText(value)
    .replace(/까지의/g, '까지')
    .replace(/부터의/g, '부터')
}

function stripMovieTitleDecorations(value: string) {
  let next = value
    .trim()
    .replace(/^\[[^\]]+\]\s*/, '')
    .replace(/\s*\+\s*(?:시네토크|씨네토크|GV|관객과의\s*대화|무대인사|해설|강연).*/i, '')
    .replace(/\s+with\s+(?:Q&A|GV|시네토크|씨네토크|관객과의\s*대화).*/i, '')

  for (let index = 0; index < 4; index++) {
    const stripped = next
      .replace(/\s*\((?:2D|3D|4D|영문자막|한글자막|자막|더빙|굿즈패키지|GV|시네토크|씨네토크|관객과의\s*대화|무대인사|해설|강연|CT|SIAFF|공연)(?:\s*[-/·,]\s*(?:2D|3D|4D|영문자막|한글자막|자막|더빙|굿즈패키지|GV|시네토크|씨네토크|관객과의\s*대화|무대인사|해설|강연|CT|SIAFF|공연))*\)\s*$/i, '')
      .trim()
    if (stripped === next) break
    next = stripped
  }

  return next
}

function stripKnownProgramPrefix(value: string) {
  return value
    .replace(/^(?:다양한\s*시선|지역영화상영회|메이드\s*인\s*광주|넥스트\s*웨이브|한국\s*단편\s*쇼케이스\s*\d*|수요단편극장)\s*[:：]\s*/i, '')
    .trim()
}

function titleSimilarity(a: string, b: string) {
  if (a === b) return 1
  const distance = levenshteinDistance(a, b)
  return 1 - distance / Math.max(a.length, b.length)
}

function levenshteinDistance(a: string, b: string) {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index)

  for (let i = 0; i < a.length; i++) {
    let northwest = previous[0]
    previous[0] = i + 1

    for (let j = 0; j < b.length; j++) {
      const deletion = previous[j + 1] + 1
      const insertion = previous[j] + 1
      const substitution = northwest + (a[i] === b[j] ? 0 : 1)
      northwest = previous[j + 1]
      previous[j + 1] = Math.min(deletion, insertion, substitution)
    }
  }

  return previous[b.length]
}

function isMissingUpdatedAtTriggerError(message: string) {
  return message.includes('record "new" has no field "updated_at"')
}

function mergeWarnings(current: string[], next: Array<string | undefined>) {
  const filteredCurrent = current.filter(
    (warning) =>
      !warning.startsWith('자동 극장 매칭 실패:') &&
      !warning.startsWith('자동 영화 매칭 실패:') &&
      !warning.startsWith('영화 매칭 실패:') &&
      !warning.startsWith('KMDB 자동 매칭 실패:'),
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
