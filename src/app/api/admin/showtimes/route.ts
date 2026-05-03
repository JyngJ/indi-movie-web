import type { ShowtimeApprovalPayload } from '@/types/admin'
import {
  listAdminSources,
  listCrawlRuns,
  listReviewCandidates,
  updateCandidateStatuses,
} from '@/lib/admin/store'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const status = url.searchParams.get('status') ?? undefined

  return Response.json({
    sources: listAdminSources(),
    runs: listCrawlRuns(),
    candidates: listReviewCandidates(
      status === 'draft' || status === 'needs_review' || status === 'approved' || status === 'rejected'
        ? status
        : undefined,
    ),
  })
}

export async function PATCH(request: Request) {
  const payload = (await request.json()) as Partial<ShowtimeApprovalPayload>

  if (!payload.ids?.length || !payload.status) {
    return Response.json(
      { error: { code: 'INVALID_REVIEW_PAYLOAD', message: '검수할 항목과 상태가 필요합니다.' } },
      { status: 400 },
    )
  }

  const updated = updateCandidateStatuses(payload.ids, payload.status)

  return Response.json({ updated })
}
