import type { CrawlRequestPayload, CrawlRun } from '@/types/admin'
import { parseShowtimeCandidates, resolveCrawlInput } from '@/lib/admin/crawler'
import { getAdminSource, saveCrawlRun } from '@/lib/admin/store'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const payload = (await request.json()) as Partial<CrawlRequestPayload>
  const source = payload.sourceId ? getAdminSource(payload.sourceId) : null

  if (!source) {
    return Response.json(
      { error: { code: 'SOURCE_NOT_FOUND', message: '크롤링 소스를 찾을 수 없습니다.' } },
      { status: 404 },
    )
  }

  const startedAt = new Date().toISOString()

  try {
    const content = await resolveCrawlInput(
      payload.inputKind ?? 'fixture',
      payload.content,
      payload.url ?? source.listingUrl,
    )
    const candidates = parseShowtimeCandidates(content, {
      source,
      inputKind: payload.inputKind ?? 'fixture',
      sourceUrl: payload.url ?? source.listingUrl,
    })
    const run: CrawlRun = {
      id: `run_${Date.now().toString(36)}`,
      sourceId: source.id,
      sourceName: source.theaterName,
      inputKind: payload.inputKind ?? 'fixture',
      status: 'completed',
      startedAt,
      finishedAt: new Date().toISOString(),
      candidates,
      createdCount: candidates.length,
      updatedCount: 0,
      warningCount: candidates.reduce((sum, candidate) => sum + candidate.warnings.length, 0),
    }

    return Response.json(saveCrawlRun(run))
  } catch (error) {
    const run: CrawlRun = {
      id: `run_${Date.now().toString(36)}`,
      sourceId: source.id,
      sourceName: source.theaterName,
      inputKind: payload.inputKind ?? 'fixture',
      status: 'failed',
      startedAt,
      finishedAt: new Date().toISOString(),
      candidates: [],
      createdCount: 0,
      updatedCount: 0,
      warningCount: 0,
      error: error instanceof Error ? error.message : '알 수 없는 크롤링 오류입니다.',
    }

    saveCrawlRun(run)

    return Response.json(run, { status: 500 })
  }
}
