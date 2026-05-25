import { adminAuthErrorResponse, requireAdminSessionUser } from '@/lib/admin/auth'
import { runAllSources } from '@/lib/crawl/run-all-sources'
import { notifyDiscord } from '@/lib/crawl/notify-discord'

export const dynamic = 'force-dynamic'
// 크롤이 최대 5분 걸릴 수 있으므로 Vercel 타임아웃을 300s로 설정
export const maxDuration = 300

const CRON_SECRET = process.env.CRON_SECRET

function isCronRequest(request: Request) {
  const auth = request.headers.get('authorization')
  return CRON_SECRET && auth === `Bearer ${CRON_SECRET}`
}

export async function POST(request: Request) {
  if (!isCronRequest(request)) {
    try { await requireAdminSessionUser(request) } catch (error) { return adminAuthErrorResponse(error) }
  }

  const result = await runAllSources()
  await notifyDiscord({ title: '📽 상영시간표 수집', runs: result.runs, durationMs: result.durationMs, matched: result.matched })
  return Response.json({ ok: true, collected: result.runs.reduce((s, r) => s + r.createdCount, 0), matched: result.matched, durationMs: result.durationMs })
}
