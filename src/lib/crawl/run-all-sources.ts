import type { CrawlRun } from '@/types/admin'
import { crawlShowtimeCandidates } from '@/lib/admin/crawler'
import { listAdminSources, saveCrawlRun } from '@/lib/admin/store'

export interface RunAllResult {
  runs: CrawlRun[]
  durationMs: number
}

export async function runAllSources(
  onProgress?: (current: number, total: number, run: CrawlRun) => void,
): Promise<RunAllResult> {
  const sources = await listAdminSources()
  const enabled = sources.filter((s) => s.enabled)
  const total = enabled.length
  const startedAt = Date.now()
  const runs: CrawlRun[] = new Array(total)
  let completed = 0

  async function crawlOne(index: number) {
    const source = enabled[index]
    const runStartedAt = new Date().toISOString()
    try {
      const crawlPromise = crawlShowtimeCandidates({
        source,
        inputKind: 'url',
        sourceUrl: source.listingUrl,
      })
      // dtryx는 동시성 1(밴 방지)로 14일 × 영화수를 순차 호출하므로 상영작이 많은 극장(아트나인 등)은
      // 30s를 넘긴다. 동시성은 그대로 두고 소스 타임아웃만 늘려 heavy 극장을 살린다.
      const timeoutMs = source.parser === 'dtryxReservationApi' ? 90000 : 30000
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`소스 타임아웃 (${timeoutMs / 1000}s)`)), timeoutMs),
      )
      const candidates = await Promise.race([crawlPromise, timeoutPromise])
      const run: CrawlRun = {
        id: `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        sourceId: source.id,
        sourceName: source.theaterName,
        inputKind: 'url',
        status: 'completed',
        startedAt: runStartedAt,
        finishedAt: new Date().toISOString(),
        candidates,
        createdCount: candidates.length,
        updatedCount: 0,
        warningCount: candidates.reduce((sum, c) => sum + c.warnings.length, 0),
      }
      await saveCrawlRun(run)
      runs[index] = run
      onProgress?.(++completed, total, run)
    } catch (error) {
      const run: CrawlRun = {
        id: `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
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
      runs[index] = run
      onProgress?.(++completed, total, run)
    }
  }

  // dtryx 소스(www.dtryx.com 기반, 40개)는 같은 백엔드를 공유해서 한 번에 많이 몰리면
  // 서버 응답이 느려져 30s 타임아웃에 걸린다 — 별도의 낮은 동시성 큐로 분리해서 처리
  const DTRYX_CONCURRENCY = 1
  const DEFAULT_CONCURRENCY = 12

  const dtryxQueue: number[] = []
  const defaultQueue: number[] = []
  enabled.forEach((source, i) => (source.parser === 'dtryxReservationApi' ? dtryxQueue : defaultQueue).push(i))

  function makeWorker(queue: number[]) {
    let nextIndex = 0
    return async function worker() {
      while (nextIndex < queue.length) {
        await crawlOne(queue[nextIndex++])
      }
    }
  }

  await Promise.all([
    ...Array.from({ length: Math.min(DTRYX_CONCURRENCY, dtryxQueue.length) }, makeWorker(dtryxQueue)),
    ...Array.from({ length: Math.min(DEFAULT_CONCURRENCY, defaultQueue.length) }, makeWorker(defaultQueue)),
  ])

  return { runs, durationMs: Date.now() - startedAt }
}
