import { waitUntil } from '@vercel/functions'
import { adminAuthErrorResponse, requireAdminSessionUser } from '@/lib/admin/auth'
import { runAllSources } from '@/lib/crawl/run-all-sources'
import { notifyDiscord, notifyDiscordStart } from '@/lib/crawl/notify-discord'

export const dynamic = 'force-dynamic'
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

  waitUntil(
    notifyDiscordStart('📽 상영시간표 수집').then(() =>
      runAllSources()
    ).then((result) =>
      notifyDiscord({ title: '📽 상영시간표 수집', runs: result.runs, durationMs: result.durationMs, matched: result.matched }),
    ),
  )

  return Response.json({ ok: true, message: '수집 시작됨' }, { status: 202 })
}
