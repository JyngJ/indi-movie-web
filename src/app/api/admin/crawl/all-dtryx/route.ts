import type { CrawlRun } from '@/types/admin'
import { adminAuthErrorResponse, requireAdminSessionUser } from '@/lib/admin/auth'
import { crawlAllDtryxSources } from '@/lib/admin/crawler'
import { listAdminSources, saveCrawlRun } from '@/lib/admin/store'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    await requireAdminSessionUser(request)
  } catch (error) {
    return adminAuthErrorResponse(error)
  }

  const startedAt = new Date().toISOString()

  try {
    const allSources = await listAdminSources()
    const dtryxSources = allSources.filter((s) => s.enabled && s.parser === 'dtryxReservationApi')

    if (dtryxSources.length === 0) {
      return Response.json({ runs: [], message: '활성화된 디트릭스 소스가 없습니다.' })
    }

    const results = await crawlAllDtryxSources(dtryxSources)

    const runs: CrawlRun[] = await Promise.all(
      results.map(async ({ source, candidates, error }) => {
        const run: CrawlRun = {
          id: `run_${Date.now().toString(36)}_${source.id.slice(0, 8)}`,
          sourceId: source.id,
          sourceName: source.theaterName,
          inputKind: 'url',
          status: error ? 'failed' : 'completed',
          startedAt,
          finishedAt: new Date().toISOString(),
          candidates,
          createdCount: candidates.length,
          updatedCount: 0,
          warningCount: candidates.reduce((sum, c) => sum + c.warnings.length, 0),
          error,
        }

        await saveCrawlRun(run)
        return run
      }),
    )

    return Response.json({ runs })
  } catch (error) {
    return Response.json(
      { error: { message: error instanceof Error ? error.message : '일괄 크롤링에 실패했습니다.' } },
      { status: 500 },
    )
  }
}
