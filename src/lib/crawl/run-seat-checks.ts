import type { CrawlRun } from '@/types/admin'
import { crawlShowtimeCandidates } from '@/lib/admin/crawler'
import { listAdminSources, saveCrawlRun } from '@/lib/admin/store'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export interface RunSeatResult {
  runs: CrawlRun[]
  durationMs: number
}

/**
 * dtryxReservationApi 소스만 크롤해서 좌석 정보를 갱신.
 * showtime_candidates의 seat_available/seat_total을 upsert한다.
 */
export async function runSeatChecks(): Promise<RunSeatResult> {
  const sources = await listAdminSources()
  const seatSources = sources.filter((s) => s.enabled && s.parser === 'dtryxReservationApi')
  const startedAt = Date.now()
  const runs: CrawlRun[] = []
  const supabase = createSupabaseAdminClient()

  for (const source of seatSources) {
    const runStartedAt = new Date().toISOString()
    try {
      const candidates = await crawlShowtimeCandidates({
        source,
        inputKind: 'url',
        sourceUrl: source.listingUrl,
      })

      // 좌석 수 업데이트: fingerprint 기준 upsert
      if (candidates.length > 0) {
        const rows = candidates.map((c) => ({
          fingerprint: c.fingerprint,
          seat_available: c.seatAvailable,
          seat_total: c.seatTotal,
        }))

        for (const row of rows) {
          await supabase
            .from('showtime_candidates')
            .update({ seat_available: row.seat_available, seat_total: row.seat_total })
            .eq('fingerprint', row.fingerprint)
        }
      }

      const run: CrawlRun = {
        id: `seat_${Date.now().toString(36)}`,
        sourceId: source.id,
        sourceName: source.theaterName,
        inputKind: 'url',
        status: 'completed',
        startedAt: runStartedAt,
        finishedAt: new Date().toISOString(),
        candidates,
        createdCount: 0,
        updatedCount: candidates.length,
        warningCount: 0,
      }

      await saveCrawlRun(run)
      runs.push(run)
    } catch (error) {
      const run: CrawlRun = {
        id: `seat_${Date.now().toString(36)}`,
        sourceId: source.id,
        sourceName: source.theaterName,
        inputKind: 'url',
        status: 'failed',
        startedAt: runStartedAt,
        finishedAt: new Date().toISOString(),
        candidates: [],
        createdCount: 0,
        updatedCount: 0,
        warningCount: 0,
        error: error instanceof Error ? error.message : String(error),
      }

      await saveCrawlRun(run)
      runs.push(run)
    }
  }

  return { runs, durationMs: Date.now() - startedAt }
}
