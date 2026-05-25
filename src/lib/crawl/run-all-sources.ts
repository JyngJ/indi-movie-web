import type { CrawlRun } from '@/types/admin'
import { crawlShowtimeCandidates } from '@/lib/admin/crawler'
import { listAdminSources, saveCrawlRun } from '@/lib/admin/store'

export interface RunAllResult {
  runs: CrawlRun[]
  durationMs: number
}

/**
 * enabled된 모든 소스를 순회해서 크롤링 후 DB에 저장.
 * 어드민 API route와 GitHub Actions 스크립트가 모두 이 함수를 호출한다.
 */
export async function runAllSources(): Promise<RunAllResult> {
  const sources = await listAdminSources()
  const enabled = sources.filter((s) => s.enabled)
  const startedAt = Date.now()
  const runs: CrawlRun[] = []

  for (const source of enabled) {
    const runStartedAt = new Date().toISOString()
    try {
      const candidates = await crawlShowtimeCandidates({
        source,
        inputKind: 'url',
        sourceUrl: source.listingUrl,
      })

      const run: CrawlRun = {
        id: `run_${Date.now().toString(36)}`,
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
      runs.push(run)
    } catch (error) {
      const run: CrawlRun = {
        id: `run_${Date.now().toString(36)}`,
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
