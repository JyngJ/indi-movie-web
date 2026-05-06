import type { AdminMovieInput, CandidateMatchPayload } from '@/types/admin'
import { adminAuthErrorResponse, requireAdminSessionUser } from '@/lib/admin/auth'
import { createAdminMovie, updateCandidateMatch } from '@/lib/admin/store'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request) {
  try {
    await requireAdminSessionUser(request)
  } catch (error) {
    return adminAuthErrorResponse(error)
  }

  const payload = (await request.json()) as Partial<CandidateMatchPayload>

  if (!payload.candidateId) {
    return Response.json(
      { error: { code: 'INVALID_MATCH_PAYLOAD', message: '매칭을 저장할 후보가 필요합니다.' } },
      { status: 400 },
    )
  }

  try {
    const candidate = await updateCandidateMatch({
      candidateId: payload.candidateId,
      matchedTheaterId: payload.matchedTheaterId,
      matchedMovieId: payload.matchedMovieId,
    })

    return Response.json({ candidate })
  } catch (error) {
    return Response.json(
      {
        error: {
          code: 'CANDIDATE_MATCH_ERROR',
          message: error instanceof Error ? error.message : '후보 매칭을 저장하지 못했습니다.',
        },
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminSessionUser(request)
  } catch (error) {
    return adminAuthErrorResponse(error)
  }

  const payload = (await request.json()) as Partial<AdminMovieInput>

  try {
    const movie = await createAdminMovie({
      title: payload.title ?? '',
      year: Number(payload.year),
      originalTitle: payload.originalTitle,
    })

    return Response.json({ movie }, { status: 201 })
  } catch (error) {
    return Response.json(
      {
        error: {
          code: 'MOVIE_CREATE_ERROR',
          message: error instanceof Error ? error.message : '영화 후보를 생성하지 못했습니다.',
        },
      },
      { status: 400 },
    )
  }
}
