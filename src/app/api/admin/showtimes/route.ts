import type { ShowtimeApprovalPayload } from '@/types/admin'
import { adminAuthErrorResponse, requireAdminSessionUser } from '@/lib/admin/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import {
  listAdminSources,
  listAdminMatchOptions,
  listCrawlRuns,
  listReviewCandidates,
  updateCandidateStatuses,
  deleteCandidates,
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

  const offset = url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')!, 10) : 0
  const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!, 10) : 1000

  try {
    const [sources, runs, candidates, matchOptions] = await Promise.all([
      listAdminSources(),
      listCrawlRuns(),
      listReviewCandidates(normalizedStatus, offset, limit),
      listAdminMatchOptions(),
    ])

    // Get total count of candidates matching the filter
    const supabase = createSupabaseAdminClient()
    let countQuery = supabase
      .from('showtime_candidates')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'rejected')
      .neq('status', 'approved')

    if (normalizedStatus) {
      countQuery = countQuery.eq('status', normalizedStatus)
    }

    const { count } = await countQuery

    return Response.json({ sources, runs, candidates, matchOptions, totalCandidates: count })
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

  if (payload.status === 'rejected') {
    await deleteCandidates(payload.ids)
    return Response.json({ deleted: payload.ids.length })
  }

  const updated = await updateCandidateStatuses(payload.ids, payload.status)

  return Response.json({ updated })
}
