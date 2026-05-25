import { waitUntil } from '@vercel/functions'
import { adminAuthErrorResponse, requireAdminSessionUser } from '@/lib/admin/auth'
import { runSeatChecks } from '@/lib/crawl/run-seat-checks'
import { notifyDiscord } from '@/lib/crawl/notify-discord'

export const dynamic = 'force-dynamic'

const CRON_SECRET = process.env.CRON_SECRET

function isCronRequest(request: Request) {
  const auth = request.headers.get('authorization')
  return CRON_SECRET && auth === `Bearer ${CRON_SECRET}`
}

export async function POST(request: Request) {
  if (!isCronRequest(request)) {
    try { await requireAdminSessionUser(request) } catch (error) { return adminAuthErrorResponse(error) }
  }

  waitUntil(
    runSeatChecks().then((result) => {
      const failed = result.runs.filter((r) => r.status === 'failed')
      if (failed.length > 0) {
        return notifyDiscord({ title: '🪑 좌석 갱신 실패', runs: result.runs, durationMs: result.durationMs })
      }
    }),
  )

  return Response.json({ ok: true, message: '좌석 갱신 시작됨' }, { status: 202 })
}
