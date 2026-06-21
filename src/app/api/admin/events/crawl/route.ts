import { adminAuthErrorResponse, requireAdminSessionUser } from '@/lib/admin/auth'
import { crawlEventCandidates } from '@/lib/admin/event-crawler'
import { getEventSource, markEventSourceCrawled, saveEventCandidates } from '@/lib/admin/event-store'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// POST /api/admin/events/crawl
// body: { sourceId: string }
export async function POST(request: Request) {
  try {
    await requireAdminSessionUser(request)
  } catch (error) {
    return adminAuthErrorResponse(error)
  }

  const body = (await request.json()) as { sourceId?: string }
  if (!body.sourceId) {
    return Response.json(
      { error: { code: 'MISSING_SOURCE_ID', message: 'sourceId가 필요합니다.' } },
      { status: 400 },
    )
  }

  const source = await getEventSource(body.sourceId)
  if (!source) {
    return Response.json(
      { error: { code: 'SOURCE_NOT_FOUND', message: '이벤트 소스를 찾을 수 없습니다.' } },
      { status: 404 },
    )
  }

  if (!source.enabled) {
    return Response.json(
      { error: { code: 'SOURCE_DISABLED', message: '비활성화된 소스입니다.' } },
      { status: 400 },
    )
  }

  const startedAt = new Date().toISOString()

  try {
    const candidates = await crawlEventCandidates({ source })
    const { created, skipped } = await saveEventCandidates(candidates)
    await markEventSourceCrawled(source.id)

    return Response.json({
      sourceId: source.id,
      theaterName: source.theaterName,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: 'completed',
      total: candidates.length,
      created,
      skipped,
      candidates,
    })
  } catch (error) {
    return Response.json(
      {
        sourceId: source.id,
        theaterName: source.theaterName,
        startedAt,
        finishedAt: new Date().toISOString(),
        status: 'failed',
        total: 0,
        created: 0,
        skipped: 0,
        candidates: [],
        error: error instanceof Error ? error.message : '크롤링 실패',
      },
      { status: 500 },
    )
  }
}
