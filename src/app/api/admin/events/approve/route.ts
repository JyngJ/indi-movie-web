import { adminAuthErrorResponse, requireAdminSessionUser } from '@/lib/admin/auth'
import { approveEventCandidates, rejectEventCandidates } from '@/lib/admin/event-store'

export const dynamic = 'force-dynamic'

// POST /api/admin/events/approve
// body: { ids: string[], action: 'approve' | 'reject' }
export async function POST(request: Request) {
  let adminUser

  try {
    adminUser = await requireAdminSessionUser(request)
  } catch (error) {
    return adminAuthErrorResponse(error)
  }

  const body = (await request.json()) as { ids?: string[]; action?: string }

  if (!body.ids?.length) {
    return Response.json(
      { error: { code: 'MISSING_IDS', message: '처리할 항목 ID가 필요합니다.' } },
      { status: 400 },
    )
  }

  const action = body.action ?? 'approve'

  try {
    if (action === 'reject') {
      await rejectEventCandidates(body.ids)
      return Response.json({ rejected: body.ids.length })
    }

    const result = await approveEventCandidates(body.ids, adminUser.id)
    const status = result.failed.length > 0 && result.approved.length === 0 ? 422 : 200
    return Response.json(result, { status })
  } catch (error) {
    return Response.json(
      {
        error: {
          code: 'EVENT_APPROVAL_ERROR',
          message: error instanceof Error ? error.message : '이벤트 승인 실패',
        },
      },
      { status: 500 },
    )
  }
}
