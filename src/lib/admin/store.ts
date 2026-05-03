import type {
  AdminTheaterSource,
  AdminTheaterSourceInput,
  AdminShowtimeStatus,
  CrawledShowtimeCandidate,
  CrawlRun,
} from '@/types/admin'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

interface CrawlSourceRow {
  id: string
  theater_id: string
  theater_name: string
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

export async function saveCrawlRun(run: CrawlRun) {
  const supabase = createSupabaseAdminClient()
  const { error: runError } = await supabase
    .from('crawl_runs')
    .insert(runToRow(run))

  if (runError) throw new Error(runError.message)

  if (run.candidates.length > 0) {
    const { error: candidateError } = await supabase
      .from('showtime_candidates')
      .upsert(run.candidates.map(candidateToRow), {
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

function sourceFromRow(row: CrawlSourceRow): AdminTheaterSource {
  return {
    id: row.id,
    theaterId: row.theater_id,
    theaterName: row.theater_name,
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
  }
}

function candidateToRow(candidate: CrawledShowtimeCandidate) {
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
  }
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
