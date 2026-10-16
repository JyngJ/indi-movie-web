import type { CrawlRun } from '@/types/admin'
import { updateSeatsOptimized } from '@/lib/admin/crawler'
import { listAdminSources, saveCrawlRun } from '@/lib/admin/store'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { mapWithConcurrency } from '@/lib/admin/crawler/utils'
import { buildSeatUpdateBatches, type SeatReading } from './seatUpdateBatches'
import { chunk, dedupeByKey, isMissingRpcError } from './bulkWrites'

const SEAT_DB_CONCURRENCY = 8
const SEAT_RPC_CHUNK = 1000
const MISSING_RPC = 'missing-rpc'

type Supabase = ReturnType<typeof createSupabaseAdminClient>

async function writeSeatsBulk(supabase: Supabase, readings: readonly SeatReading[], known: ReadonlySet<string>) {
  const rows = dedupeByKey(readings.filter((r) => known.has(r.fingerprint)), (r) => r.fingerprint)
    .map((r) => ({ fingerprint: r.fingerprint, seat_available: r.seatAvailable, seat_total: r.seatTotal }))
  let updatedCount = 0
  for (const part of chunk(rows, SEAT_RPC_CHUNK)) {
    const { data, error } = await supabase.rpc('apply_candidate_seats', { updates: part })
    if (isMissingRpcError(error)) return { updatedCount, error: MISSING_RPC }
    if (error) return { updatedCount, error: `좌석 저장 실패: ${error.code} ${error.message}` }
    updatedCount += typeof data === 'number' ? data : part.length
  }
  return { updatedCount, error: undefined as string | undefined }
}

/** RPC 없을 때의 예전 방식 — 같은 좌석 값끼리 묶어 UPDATE ... WHERE fingerprint IN (...) */
async function writeSeatsByValue(supabase: Supabase, readings: readonly SeatReading[], known: ReadonlySet<string>) {
  const batches = buildSeatUpdateBatches(readings, known)
  let updatedCount = 0
  let error: string | undefined
  await mapWithConcurrency(batches.map((batch) => async () => {
    if (error) return
    const { error: dbError } = await supabase
      .from('showtime_candidates')
      .update({ seat_available: batch.seatAvailable, seat_total: batch.seatTotal })
      .in('fingerprint', batch.fingerprints)
    if (dbError) {
      error = `좌석 저장 실패: ${dbError.code} ${dbError.message}`
      return
    }
    updatedCount += batch.fingerprints.length
  }), SEAT_DB_CONCURRENCY)
  return { updatedCount, error }
}

export interface RunSeatResult {
  runs: CrawlRun[]
  durationMs: number
}

function todayIsoDate() {
  const d = new Date()
  d.setHours(d.getHours() + 9)
  return d.toISOString().split('T')[0]
}

/**
 * 활성화된 모든 소스의 좌석 정보를 갱신.
 * showtime_candidates의 seat_available/seat_total을 upsert한다.
 */
export async function runSeatChecks(): Promise<RunSeatResult> {
  const sources = await listAdminSources()
  const fastSeatParsers = [
    'dtryxReservationApi',
    'movieeTicketApi',
    'cineQApi',
    'tinyticketEventManager',
    'petitecine',
    'kofaCinematheque',
    'movielandProductOptions',
  ]
  const seatSources = sources.filter((s) => s.enabled && fastSeatParsers.includes(s.parser))
  const startedAt = Date.now()
  const runs: CrawlRun[] = []
  const supabase = createSupabaseAdminClient()

  if (seatSources.length === 0) {
    return { runs: [], durationMs: 0 }
  }

  const runStartedAt = new Date().toISOString()
  
  const todayDash = todayIsoDate()

  // DB에서 오늘 이후의 상영 후보들 미리 조회
  const { data: dbRows } = await supabase
    .from('showtime_candidates')
    .select('id, source_id, booking_url, fingerprint, show_date')
    .gte('show_date', todayDash)

  const knownFingerprints = new Set((dbRows ?? []).map((r) => r.fingerprint))

  // 모든 좌석 갱신 소스에 대해 최적화된 업데이트 (각 파서별 병렬 처리)
  const results = await updateSeatsOptimized(seatSources, dbRows ?? [])

  for (const { source, candidates, error, warningCount = 0 } of results) {
    if (error) {
      const run: CrawlRun = {
        id: `seat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        sourceId: source.id,
        sourceName: source.theaterName,
        inputKind: 'url',
        status: 'failed',
        startedAt: runStartedAt,
        finishedAt: new Date().toISOString(),
        candidates: [],
        createdCount: 0,
        updatedCount: 0,
        warningCount,
        error,
      }
      await saveCrawlRun(run)
      runs.push(run)
      continue
    }

    // 좌석 수 업데이트 — apply_candidate_seats RPC 한 번에 극장 하나(docs/SUPABASE_BULK_WRITES.sql).
    // 예전엔 같은 좌석 값끼리 묶어 UPDATE ... WHERE fingerprint IN (...)을 보냈는데, 좌석 값이 회차마다
    // 달라 사실상 회차 하나에 요청 하나였다(2026-10 로그 실측 하루 약 4,500건). RPC가 아직 없으면 예전 방식.
    // upsert는 쓰지 않는다 — 이미 있는 행이어도 id 등 NOT NULL 컬럼이 빠지면 23502로 막힌다.
    let { updatedCount, error: updateError } = await writeSeatsBulk(supabase, candidates, knownFingerprints)
    if (updateError === MISSING_RPC) {
      ;({ updatedCount, error: updateError } = await writeSeatsByValue(supabase, candidates, knownFingerprints))
    }

    if (updateError) {
      const run: CrawlRun = {
        id: `seat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        sourceId: source.id,
        sourceName: source.theaterName,
        inputKind: 'url',
        status: 'failed',
        startedAt: runStartedAt,
        finishedAt: new Date().toISOString(),
        candidates: [],
        createdCount: 0,
        updatedCount,
        warningCount,
        error: updateError,
      }
      await saveCrawlRun(run)
      runs.push(run)
      continue
    }

    const run: CrawlRun = {
      id: `seat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      sourceId: source.id,
      sourceName: source.theaterName,
      inputKind: 'url',
      status: 'completed',
      startedAt: runStartedAt,
      finishedAt: new Date().toISOString(),
      candidates: [],
      createdCount: 0,
      updatedCount,
      warningCount,
    }

    await saveCrawlRun(run)
    runs.push(run)
  }

  return {
    runs,
    durationMs: Date.now() - startedAt,
  }
}
