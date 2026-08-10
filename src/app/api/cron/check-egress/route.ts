import { checkEgressAnomaly } from '@/lib/monitoring/checkEgressAnomaly'
import { notifyEgressAnomaly } from '@/lib/monitoring/notifyEgressAnomaly'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * Vercel Cron 전용 — vercel.json의 crons 설정으로 하루 1번 호출된다.
 * (Hobby 플랜은 크론이 하루 1번 이상 못 돌아서 3시간 간격 대신 이렇게 함 — 대신
 * 점검 윈도우를 24시간으로 넓혀 그 사이 스파이크를 놓치지 않게 한다.)
 * Vercel이 자동으로 `Authorization: Bearer $CRON_SECRET`을 붙여 보내므로 그걸로 검증.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return Response.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  try {
    const result = await checkEgressAnomaly(24)
    await notifyEgressAnomaly(result)
    return Response.json(result)
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : '점검 실패' },
      { status: 500 },
    )
  }
}
