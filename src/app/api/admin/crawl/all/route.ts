import { waitUntil } from '@vercel/functions'
import { adminAuthErrorResponse, requireAdminSessionUser } from '@/lib/admin/auth'
import { autoMatchShowtimeCandidates } from '@/lib/admin/store'
import { runAllSources } from '@/lib/crawl/run-all-sources'
import { notifyDiscord, notifyDiscordError, notifyDiscordMatch, notifyDiscordStart } from '@/lib/crawl/notify-discord'

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
    (async () => {
      // 1단계: 시작
      await notifyDiscordStart('📽 상영시간표 수집')

      // 2단계: 크롤
      const crawlResult = await runAllSources()
      await notifyDiscord({ title: '📽 수집 완료', runs: crawlResult.runs, durationMs: crawlResult.durationMs })

      // 3단계: 자동매칭
      const matchStart = Date.now()
      const matchResult = await autoMatchShowtimeCandidates()
      await notifyDiscordMatch(matchResult.matched, matchResult.needsReview, Date.now() - matchStart)
    })().catch(async (error: unknown) => {
      const msg = error instanceof Error ? error.message : String(error)
      await notifyDiscordError('📽 상영시간표 수집', msg)
    }),
  )

  return Response.json({ ok: true, message: '수집 시작됨' }, { status: 202 })
}
