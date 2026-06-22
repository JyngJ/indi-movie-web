import { adminAuthErrorResponse, requireAdminSessionUser } from '@/lib/admin/auth'
import { updateEventCandidateMatch } from '@/lib/admin/event-store'

export const dynamic = 'force-dynamic'

// PATCH /api/admin/events/matches
// body: { candidateId, matchedTheaterId?, matchedMovieId? }
export async function PATCH(request: Request) {
  try {
    await requireAdminSessionUser(request)
  } catch (error) {
    return adminAuthErrorResponse(error)
  }

  const body = (await request.json()) as {
    candidateId?: string
    matchedTheaterId?: string
    matchedMovieId?: string
  }

  if (!body.candidateId) {
    return Response.json(
      { error: { code: 'MISSING_CANDIDATE_ID', message: 'candidateId가 필요합니다.' } },
      { status: 400 },
    )
  }

  try {
    await updateEventCandidateMatch(body.candidateId, body.matchedTheaterId, body.matchedMovieId)
    return Response.json({ ok: true })
  } catch (error) {
    return Response.json(
      { error: { code: 'MATCH_UPDATE_ERROR', message: error instanceof Error ? error.message : '매칭 저장 실패' } },
      { status: 500 },
    )
  }
}
