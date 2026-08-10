import { checkEgressAnomaly } from '@/lib/monitoring/checkEgressAnomaly'
import { notifyEgressAnomaly } from '@/lib/monitoring/notifyEgressAnomaly'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * Vercel Cron 전용 — vercel.json의 crons 설정으로 3시간마다 호출된다.
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
    const result = await checkEgressAnomaly(3)
    await notifyEgressAnomaly(result)
    return Response.json(result)
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : '점검 실패' },
      { status: 500 },
    )
  }
}
