import type { ShowtimeApprovalPayload } from '@/types/admin'
import { adminAuthErrorResponse, requireAdminSessionUser } from '@/lib/admin/auth'
import { autoMatchShowtimeCandidates } from '@/lib/admin/store'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    await requireAdminSessionUser(request)
  } catch (error) {
    return adminAuthErrorResponse(error)
  }

  const payload = (await request.json().catch(() => ({}))) as Partial<ShowtimeApprovalPayload>

  try {
    const result = await autoMatchShowtimeCandidates(payload.ids)
    return Response.json(result)
  } catch (error) {
    return Response.json(
      {
        error: {
          code: 'CANDIDATE_AUTO_MATCH_ERROR',
          message: error instanceof Error ? error.message : '후보 자동 매칭에 실패했습니다.',
        },
      },
      { status: 500 },
    )
  }
}
