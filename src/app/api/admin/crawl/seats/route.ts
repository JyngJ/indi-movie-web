import { adminAuthErrorResponse, requireAdminSessionUser } from '@/lib/admin/auth'
import { runSeatChecks } from '@/lib/crawl/run-seat-checks'
import { notifyDiscord } from '@/lib/crawl/notify-discord'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const CRON_SECRET = process.env.CRON_SECRET

function isCronRequest(request: Request) {
  const auth = request.headers.get('authorization')
  return CRON_SECRET && auth === `Bearer ${CRON_SECRET}`
}

export async function POST(request: Request) {
  if (!isCronRequest(request)) {
    try { await requireAdminSessionUser(request) } catch (error) { return adminAuthErrorResponse(error) }
  }

  const result = await runSeatChecks()
  const failed = result.runs.filter((r) => r.status === 'failed')
  if (failed.length > 0) {
    await notifyDiscord({ title: '🪑 좌석 갱신 실패', runs: result.runs, durationMs: result.durationMs })
  }
  return Response.json({ ok: true, updated: result.runs.reduce((s, r) => s + r.updatedCount, 0), durationMs: result.durationMs })
}
