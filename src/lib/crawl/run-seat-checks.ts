import type { CrawlRun } from '@/types/admin'
import { updateSeatsOptimized } from '@/lib/admin/crawler'
import { listAdminSources, saveCrawlRun } from '@/lib/admin/store'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

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
    'cineqApi',
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
  const todayCompact = todayDash.replace(/-/g, '')
  const currentYear = todayDash.slice(0, 4)

  // DB에서 올해의 상영 후보들 미리 조회 후, 과거 날짜 필터링
  const { data: rawDbRows } = await supabase
    .from('showtime_candidates')
    .select('id, source_id, booking_url, fingerprint, show_date')
    .gte('show_date', currentYear)

  const dbRows = (rawDbRows ?? []).filter((r) => {
    if (!r.show_date) return false
    if (r.show_date.includes('-')) return r.show_date >= todayDash
    return r.show_date >= todayCompact
  })

  // 모든 좌석 갱신 소스에 대해 최적화된 업데이트 (각 파서별 병렬 처리)
  const results = await updateSeatsOptimized(seatSources, dbRows)

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

    // 좌석 수 업데이트: fingerprint 기준 단일 배치 upsert
    if (candidates.length > 0) {
      const rows = candidates.map((c) => ({
        fingerprint: c.fingerprint,
        seat_available: c.seatAvailable,
        seat_total: c.seatTotal,
      }))

      await supabase.from('showtime_candidates').upsert(rows, { onConflict: 'fingerprint' })
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
      updatedCount: candidates.length,
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
