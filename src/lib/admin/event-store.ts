import type {
  AdminEventSource,
  AdminShowtimeStatus,
  CrawledEventCandidate,
  TheaterEvent,
} from '@/types/admin'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

// ── Row types ────────────────────────────────────────────────────────────────

interface EventSourceRow {
  id: string
  theater_id: string
  theater_name: string
  matched_theater_id: string | null
  homepage_url: string | null
  listing_url: string
  parser: string
  enabled: boolean
  cadence: string
  health: string
  notes: string | null
  last_crawled_at: string | null
}

interface EventCandidateRow {
  id: string
  source_id: string
  theater_id: string
  theater_name: string
  event_type: string
  title: string
  movie_title: string | null
  event_date: string
  event_time: string | null
  end_time: string | null
  guests: string[]
  description: string | null
  booking_url: string | null
  source_url: string | null
  raw_text: string
  confidence: number
  warnings: string[]
  status: string
  fingerprint: string
  matched_theater_id: string | null
  matched_movie_id: string | null
  approved_at: string | null
  approved_by: string | null
}

// ── Converters ───────────────────────────────────────────────────────────────

function sourceFromRow(row: EventSourceRow): AdminEventSource {
  return {
    id: row.id,
    theaterId: row.theater_id,
    theaterName: row.theater_name,
    matchedTheaterId: row.matched_theater_id ?? undefined,
    homepageUrl: row.homepage_url ?? undefined,
    listingUrl: row.listing_url,
    parser: row.parser as AdminEventSource['parser'],
    enabled: row.enabled,
    cadence: row.cadence as AdminEventSource['cadence'],
    health: row.health as AdminEventSource['health'],
    notes: row.notes ?? undefined,
    lastCrawledAt: row.last_crawled_at ?? undefined,
  }
}

function candidateFromRow(row: EventCandidateRow): CrawledEventCandidate {
  return {
    id: row.id,
    sourceId: row.source_id,
    theaterId: row.theater_id,
    theaterName: row.theater_name,
    eventType: row.event_type as CrawledEventCandidate['eventType'],
    title: row.title,
    movieTitle: row.movie_title ?? undefined,
    eventDate: row.event_date,
    eventTime: row.event_time ?? undefined,
    endTime: row.end_time ?? undefined,
    guests: row.guests ?? [],
    description: row.description ?? undefined,
    bookingUrl: row.booking_url ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    rawText: row.raw_text,
    confidence: row.confidence,
    warnings: row.warnings ?? [],
    status: row.status as AdminShowtimeStatus,
    fingerprint: row.fingerprint,
    matchedTheaterId: row.matched_theater_id ?? undefined,
    matchedMovieId: row.matched_movie_id ?? undefined,
    approvedAt: row.approved_at ?? undefined,
    approvedBy: row.approved_by ?? undefined,
  }
}

function candidateToRow(c: CrawledEventCandidate): Omit<EventCandidateRow, 'approved_at' | 'approved_by'> {
  return {
    id: c.id,
    source_id: c.sourceId,
    theater_id: c.theaterId,
    theater_name: c.theaterName,
    event_type: c.eventType,
    title: c.title,
    movie_title: c.movieTitle ?? null,
    event_date: c.eventDate,
    event_time: c.eventTime ?? null,
    end_time: c.endTime ?? null,
    guests: c.guests,
    description: c.description ?? null,
    booking_url: c.bookingUrl ?? null,
    source_url: c.sourceUrl ?? null,
    raw_text: c.rawText,
    confidence: c.confidence,
    warnings: c.warnings,
    status: c.status,
    fingerprint: c.fingerprint,
    matched_theater_id: c.matchedTheaterId ?? null,
    matched_movie_id: c.matchedMovieId ?? null,
  }
}

// ── Sources ───────────────────────────────────────────────────────────────────

export async function listEventSources(): Promise<AdminEventSource[]> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('event_sources')
    .select('*')
    .order('theater_name', { ascending: true })

  if (error) throw new Error(error.message)
  return ((data ?? []) as EventSourceRow[]).map(sourceFromRow)
}

export async function getEventSource(id: string): Promise<AdminEventSource | undefined> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('event_sources')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data ? sourceFromRow(data as EventSourceRow) : undefined
}

export async function markEventSourceCrawled(id: string): Promise<void> {
  const supabase = createSupabaseAdminClient()
  await supabase
    .from('event_sources')
    .update({ last_crawled_at: new Date().toISOString() })
    .eq('id', id)
}

// ── Candidates ────────────────────────────────────────────────────────────────

export async function listEventCandidates(opts?: {
  status?: AdminShowtimeStatus
  theaterId?: string
  limit?: number
}): Promise<CrawledEventCandidate[]> {
  const supabase = createSupabaseAdminClient()
  let q = supabase
    .from('event_candidates')
    .select('*')
    .order('event_date', { ascending: true })
    .limit(opts?.limit ?? 200)

  if (opts?.status) q = q.eq('status', opts.status)
  if (opts?.theaterId) q = q.eq('matched_theater_id', opts.theaterId)

  const { data, error } = await q
  if (error) throw new Error(error.message)
  return ((data ?? []) as EventCandidateRow[]).map(candidateFromRow)
}

export async function saveEventCandidates(
  candidates: CrawledEventCandidate[],
): Promise<{ created: number; skipped: number }> {
  if (candidates.length === 0) return { created: 0, skipped: 0 }

  const supabase = createSupabaseAdminClient()
  const rows = candidates.map(candidateToRow)

  // fingerprint UNIQUE — upsert skips duplicates
  const { data, error } = await supabase
    .from('event_candidates')
    .upsert(rows, { onConflict: 'fingerprint', ignoreDuplicates: true })
    .select('id')

  if (error) throw new Error(error.message)
  const created = (data ?? []).length
  return { created, skipped: candidates.length - created }
}

export async function updateEventCandidateMatch(
  candidateId: string,
  matchedTheaterId?: string,
  matchedMovieId?: string,
): Promise<void> {
  const supabase = createSupabaseAdminClient()

  // 극장 미지정 시 소스에 이미 알려진 극장(소스당 극장 1곳)으로 폴백 — 관리자가
  // 영화만 고르고 저장하면 매칭된 극장이 null로 덮어써지던 문제 방지.
  let resolvedTheaterId = matchedTheaterId ?? null
  if (!resolvedTheaterId) {
    const { data: candidate } = await supabase
      .from('event_candidates')
      .select('source_id')
      .eq('id', candidateId)
      .single()
    if (candidate?.source_id) {
      const { data: source } = await supabase
        .from('event_sources')
        .select('matched_theater_id')
        .eq('id', candidate.source_id)
        .single()
      resolvedTheaterId = source?.matched_theater_id ?? null
    }
  }

  const { error } = await supabase
    .from('event_candidates')
    .update({
      matched_theater_id: resolvedTheaterId,
      matched_movie_id: matchedMovieId ?? null,
      status: 'needs_review',
    })
    .eq('id', candidateId)

  if (error) throw new Error(error.message)
}

// ── Approval ──────────────────────────────────────────────────────────────────

interface ApprovalResult {
  approved: Array<{ candidateId: string; eventId?: string }>
  failed: Array<{ candidateId: string; reason: string }>
}

export async function approveEventCandidates(
  ids: string[],
  approvedByUserId: string | null,
): Promise<ApprovalResult> {
  const supabase = createSupabaseAdminClient()
  const result: ApprovalResult = { approved: [], failed: [] }

  const { data: rows, error } = await supabase
    .from('event_candidates')
    .select('*')
    .in('id', ids)

  if (error) throw new Error(error.message)
  const candidates = ((rows ?? []) as EventCandidateRow[]).map(candidateFromRow)

  for (const c of candidates) {
    if (!c.matchedTheaterId) {
      result.failed.push({ candidateId: c.id, reason: '극장 매칭 필요 (matched_theater_id 없음)' })
      continue
    }

    // Insert into theater_events
    const { data: inserted, error: insertErr } = await supabase
      .from('theater_events')
      .insert({
        theater_id: c.matchedTheaterId,
        movie_id: c.matchedMovieId ?? null,
        event_type: c.eventType,
        title: c.title,
        event_date: c.eventDate,
        event_time: c.eventTime ?? null,
        end_time: c.endTime ?? null,
        guests: c.guests,
        description: c.description ?? null,
        booking_url: c.bookingUrl ?? null,
        source_url: c.sourceUrl ?? '',
        is_active: true,
      })
      .select('id')
      .single()

    if (insertErr) {
      result.failed.push({ candidateId: c.id, reason: insertErr.message })
      continue
    }

    // Mark candidate approved
    const { error: updateErr } = await supabase
      .from('event_candidates')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: approvedByUserId,
      })
      .eq('id', c.id)

    if (updateErr) {
      // candidate 상태 갱신 실패 — theater_events에 고아 행이 남지 않도록 되돌린다
      await supabase.from('theater_events').delete().eq('id', inserted.id)
      result.failed.push({ candidateId: c.id, reason: updateErr.message })
      continue
    }

    result.approved.push({ candidateId: c.id, eventId: inserted?.id })
  }

  return result
}

export async function rejectEventCandidates(ids: string[]): Promise<void> {
  const supabase = createSupabaseAdminClient()
  await supabase
    .from('event_candidates')
    .update({ status: 'rejected' })
    .in('id', ids)
}

// ── Auto-match ────────────────────────────────────────────────────────────────

function normalizeTitle(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\s"'‘’“”()[\]{}:;,.!?·ㆍ・_-]+/g, '')
}

/** 제목에서 "<영화제목>" 패턴(크롤된 GV/토크 제목에 흔함) 추출 */
function extractMovieTitleGuess(title: string, movieTitle?: string): string | undefined {
  if (movieTitle) return movieTitle
  return title.match(/<([^<>]+)>/)?.[1]?.trim()
}

interface AutoMatchResult {
  totalProcessed: number
  autoApproved: number
  needsReview: number
  failed: Array<{ candidateId: string; reason: string }>
}

/**
 * event_candidates 자동 매칭 — 극장은 event_sources.matched_theater_id를 그대로 상속(소스당 극장 1곳,
 * 모호함 없음). 영화는 제목 정확 일치 시에만 연결(오매칭 방지 — 부분/유사 일치는 하지 않음).
 * 극장+영화 모두 매칭되면 바로 승인(theater_events 등록), 영화만 못 찾으면 검수 대기로 남겨둔다.
 */
export async function autoMatchEventCandidates(approvedByUserId: string | null, ids?: string[]): Promise<AutoMatchResult> {
  const supabase = createSupabaseAdminClient()

  let candidatesQuery = supabase.from('event_candidates').select('*')
  candidatesQuery = ids?.length ? candidatesQuery.in('id', ids) : candidatesQuery.in('status', ['draft', 'needs_review'])

  const [{ data: sourceRows }, { data: movieRows }, { data: candidateRows, error: candidateError }] = await Promise.all([
    supabase.from('event_sources').select('id, matched_theater_id'),
    supabase.from('movies').select('id, title, original_title'),
    candidatesQuery,
  ])

  if (candidateError) throw new Error(candidateError.message)

  const sourceTheaterMap = new Map(
    ((sourceRows ?? []) as Array<{ id: string; matched_theater_id: string | null }>)
      .filter((s) => s.matched_theater_id)
      .map((s) => [s.id, s.matched_theater_id as string]),
  )

  const movieByNormalizedTitle = new Map<string, string>()
  for (const m of (movieRows ?? []) as Array<{ id: string; title: string; original_title: string | null }>) {
    movieByNormalizedTitle.set(normalizeTitle(m.title), m.id)
    if (m.original_title) movieByNormalizedTitle.set(normalizeTitle(m.original_title), m.id)
  }

  const result: AutoMatchResult = { totalProcessed: 0, autoApproved: 0, needsReview: 0, failed: [] }
  const toApprove: string[] = []

  for (const row of (candidateRows ?? []) as EventCandidateRow[]) {
    result.totalProcessed++
    const matchedTheaterId = sourceTheaterMap.get(row.source_id)
    if (!matchedTheaterId) {
      result.failed.push({ candidateId: row.id, reason: `소스(${row.source_id})에 매칭된 극장 없음` })
      continue
    }

    const movieGuess = extractMovieTitleGuess(row.title, row.movie_title ?? undefined)
    const matchedMovieId = movieGuess ? movieByNormalizedTitle.get(normalizeTitle(movieGuess)) : undefined

    await updateEventCandidateMatch(row.id, matchedTheaterId, matchedMovieId)

    if (matchedMovieId) {
      toApprove.push(row.id)
      result.autoApproved++
    } else {
      result.needsReview++
    }
  }

  if (toApprove.length > 0) {
    const approval = await approveEventCandidates(toApprove, approvedByUserId)
    for (const f of approval.failed) {
      result.failed.push(f)
      result.autoApproved--
      result.needsReview++
    }
  }

  return result
}

// ── Public theater_events ─────────────────────────────────────────────────────

export async function listTheaterEvents(opts?: {
  theaterId?: string
  movieId?: string
  fromDate?: string
  limit?: number
}): Promise<TheaterEvent[]> {
  const supabase = createSupabaseAdminClient()
  let q = supabase
    .from('theater_events')
    .select('*, theaters(name)')
    .eq('is_active', true)
    .order('event_date', { ascending: true })
    .limit(opts?.limit ?? 100)

  if (opts?.theaterId) q = q.eq('theater_id', opts.theaterId)
  if (opts?.movieId) q = q.eq('movie_id', opts.movieId)
  if (opts?.fromDate) q = q.gte('event_date', opts.fromDate)

  const { data, error } = await q
  if (error) throw new Error(error.message)

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: row.id as string,
    theaterId: row.theater_id as string,
    theaterName: (row.theaters as { name: string } | null)?.name ?? (row.theater_id as string),
    movieId: row.movie_id as string | undefined,
    movieTitle: row.movie_title as string | undefined,
    eventType: row.event_type as TheaterEvent['eventType'],
    title: row.title as string,
    eventDate: row.event_date as string,
    eventTime: row.event_time as string | undefined,
    endTime: row.end_time as string | undefined,
    guests: (row.guests as string[]) ?? [],
    description: row.description as string | undefined,
    bookingUrl: row.booking_url as string | undefined,
    sourceUrl: row.source_url as string,
    isActive: row.is_active as boolean,
  }))
}
