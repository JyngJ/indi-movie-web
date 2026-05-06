import type { ShowtimeApprovalPayload } from '@/types/admin'
import { adminAuthErrorResponse, requireAdminSessionUser } from '@/lib/admin/auth'
import { approveShowtimeCandidates } from '@/lib/admin/store'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  let adminUser

  try {
    adminUser = await requireAdminSessionUser(request)
  } catch (error) {
    return adminAuthErrorResponse(error)
  }

  const payload = (await request.json()) as Partial<ShowtimeApprovalPayload>

  if (!payload.ids?.length) {
    return Response.json(
      { error: { code: 'INVALID_APPROVAL_PAYLOAD', message: '승인할 후보 항목이 필요합니다.' } },
      { status: 400 },
    )
  }

  try {
    const result = await approveShowtimeCandidates(payload.ids, adminUser.id)
    const status = result.failed.length > 0 && result.approved.length === 0 ? 422 : 200

    return Response.json(result, { status })
  } catch (error) {
    return Response.json(
      {
        error: {
          code: 'SHOWTIME_APPROVAL_ERROR',
          message: error instanceof Error ? error.message : '상영시간표 승인 업로드에 실패했습니다.',
        },
      },
      { status: 500 },
    )
  }
}
