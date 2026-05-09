import type { ShowtimeApprovalPayload } from '@/types/admin'
import { adminAuthErrorResponse, requireAdminSessionUser } from '@/lib/admin/auth'
import {
  listAdminSources,
  listAdminMatchOptions,
  listCrawlRuns,
  listReviewCandidates,
  updateCandidateStatuses,
} from '@/lib/admin/store'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    await requireAdminSessionUser(request)
  } catch (error) {
    return adminAuthErrorResponse(error)
  }

  const url = new URL(request.url)
  const status = url.searchParams.get('status') ?? undefined
  const normalizedStatus =
    status === 'draft' || status === 'needs_review' || status === 'approved' || status === 'rejected'
      ? status
      : undefined

  try {
    const [sources, runs, candidates, matchOptions] = await Promise.all([
      listAdminSources(),
      listCrawlRuns(),
      listReviewCandidates(normalizedStatus),
      listAdminMatchOptions(),
    ])

    return Response.json({ sources, runs, candidates, matchOptions })
  } catch (error) {
    return Response.json(
      {
        error: {
          code: 'ADMIN_DATA_ERROR',
          message: error instanceof Error ? error.message : '관리자 데이터를 불러오지 못했습니다.',
        },
      },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdminSessionUser(request)
  } catch (error) {
    return adminAuthErrorResponse(error)
  }

  const payload = (await request.json()) as Partial<ShowtimeApprovalPayload>

  if (!payload.ids?.length || !payload.status) {
    return Response.json(
      { error: { code: 'INVALID_REVIEW_PAYLOAD', message: '검수할 항목과 상태가 필요합니다.' } },
      { status: 400 },
    )
  }

  const updated = await updateCandidateStatuses(payload.ids, payload.status)

  return Response.json({ updated })
}
