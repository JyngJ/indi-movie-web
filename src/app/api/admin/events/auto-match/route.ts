import { adminAuthErrorResponse, requireAdminSessionUser } from '@/lib/admin/auth'
import { autoMatchEventCandidates } from '@/lib/admin/event-store'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  let adminUser

  try {
    adminUser = await requireAdminSessionUser(request)
  } catch (error) {
    return adminAuthErrorResponse(error)
  }

  const body = (await request.json().catch(() => ({}))) as { ids?: string[] }

  try {
    const result = await autoMatchEventCandidates(adminUser.id, body.ids)
    return Response.json(result)
  } catch (error) {
    return Response.json(
      {
        error: {
          code: 'EVENT_AUTO_MATCH_ERROR',
          message: error instanceof Error ? error.message : '이벤트 자동 매칭에 실패했습니다.',
        },
      },
      { status: 500 },
    )
  }
}
