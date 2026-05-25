import { adminAuthErrorResponse, requireAdminSessionUser } from '@/lib/admin/auth'
import { runAllSources } from '@/lib/crawl/run-all-sources'
import { notifyDiscord } from '@/lib/crawl/notify-discord'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try { await requireAdminSessionUser(request) } catch (error) { return adminAuthErrorResponse(error) }

  const result = await runAllSources()
  await notifyDiscord({ title: '어드민 전체 수집', runs: result.runs, durationMs: result.durationMs })
  return Response.json(result)
}
