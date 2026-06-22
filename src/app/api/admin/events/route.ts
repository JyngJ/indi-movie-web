import type { AdminShowtimeStatus } from '@/types/admin'
import { adminAuthErrorResponse, requireAdminSessionUser } from '@/lib/admin/auth'
import { listEventCandidates, listEventSources } from '@/lib/admin/event-store'

export const dynamic = 'force-dynamic'

// GET /api/admin/events
// ?type=candidates&status=draft|needs_review|approved|rejected
// ?type=sources
export async function GET(request: Request) {
  try {
    await requireAdminSessionUser(request)
  } catch (error) {
    return adminAuthErrorResponse(error)
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') ?? 'candidates'

  try {
    if (type === 'sources') {
      const sources = await listEventSources()
      return Response.json(sources)
    }

    const status = searchParams.get('status') as AdminShowtimeStatus | null
    const theaterId = searchParams.get('theaterId') ?? undefined
    const candidates = await listEventCandidates({
      status: status ?? undefined,
      theaterId,
    })
    return Response.json(candidates)
  } catch (error) {
    return Response.json(
      { error: { code: 'EVENT_LIST_ERROR', message: error instanceof Error ? error.message : '이벤트 목록 조회 실패' } },
      { status: 500 },
    )
  }
}
