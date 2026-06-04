import { waitUntil } from '@vercel/functions'
import { revalidatePath } from 'next/cache'
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
      await notifyDiscordMatch(matchResult.matched, matchResult.autoApproved, matchResult.needsReview, Date.now() - matchStart)

      // 4단계: CDN 캐시 무효화 (theaters는 거의 안 바뀌므로 theaters 생략, 필요시 추가)
      revalidatePath('/api/public/stations')
    })().catch(async (error: unknown) => {
      const msg = error instanceof Error ? error.message : String(error)
      await notifyDiscordError('📽 상영시간표 수집', msg)
    }),
  )

  return Response.json({ ok: true, message: '수집 시작됨' }, { status: 202 })
}
