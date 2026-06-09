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
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('소스 타임아웃 (30s)')), 30000),
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

  const CONCURRENCY = 15
  const queue = enabled.map((_, i) => i)
  let nextIndex = 0
  async function worker() {
    while (nextIndex < queue.length) {
      await crawlOne(queue[nextIndex++])
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, total) }, worker))

  return { runs, durationMs: Date.now() - startedAt }
}
