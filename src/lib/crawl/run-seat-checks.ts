import type { CrawlRun } from '@/types/admin'
import { updateSeatsOptimized } from '@/lib/admin/crawler'
import { listAdminSources, saveCrawlRun } from '@/lib/admin/store'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { mapWithConcurrency } from '@/lib/admin/crawler/utils'
import { buildSeatUpdateBatches } from './seatUpdateBatches'

const SEAT_DB_CONCURRENCY = 8

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

    // 좌석 수 업데이트: 같은 좌석 값끼리 묶어 UPDATE ... WHERE fingerprint IN (...)
    // upsert는 이미 있는 행이어도 id 등 NOT NULL 컬럼이 빠지면 23502로 막혀서
    // 좌석이 한 건도 저장되지 않았다 (에러를 안 봐서 '갱신 성공'으로 집계됨).
    const batches = buildSeatUpdateBatches(candidates, knownFingerprints)
    // 좌석 값이 회차마다 달라 묶음이 크게 줄지 않는다 — Supabase 요청만 동시 8개로 돌린다
    // (극장 사이트 요청이 아니라 dtryx 동시성 1 규칙과 무관)
    let updatedCount = 0
    let updateError: string | undefined
    await mapWithConcurrency(batches.map((batch) => async () => {
      if (updateError) return
      const { error: dbError } = await supabase
        .from('showtime_candidates')
        .update({ seat_available: batch.seatAvailable, seat_total: batch.seatTotal })
        .in('fingerprint', batch.fingerprints)
      if (dbError) {
        updateError = `좌석 저장 실패: ${dbError.code} ${dbError.message}`
        return
      }
      updatedCount += batch.fingerprints.length
    }), SEAT_DB_CONCURRENCY)

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
