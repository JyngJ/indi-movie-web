import { adminAuthErrorResponse, requireAdminSessionUser } from '@/lib/admin/auth'
import { listCrawlRuns } from '@/lib/admin/store'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    await requireAdminSessionUser(request)
  } catch (error) {
    return adminAuthErrorResponse(error)
  }

  const url = new URL(request.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '200', 10), 500)

  try {
    const runs = await listCrawlRuns(limit)
    return Response.json({ runs })
  } catch (error) {
    return Response.json(
      { error: { message: error instanceof Error ? error.message : '크롤링 로그를 불러오지 못했습니다.' } },
      { status: 500 },
    )
  }
}
