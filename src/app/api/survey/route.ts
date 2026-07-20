import { createSurveyResponse } from '@/lib/survey/store'
import { notifySurveyToDiscord } from '@/lib/survey/discord'
import { isSurveyGoodPoint, type SurveyGoodPoint } from '@/lib/survey/types'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))

    const raw: unknown[] = Array.isArray(body.goodPoints) ? body.goodPoints : []
    const goodPoints = raw
      .map(String)
      .filter((v, i, arr) => isSurveyGoodPoint(v) && arr.indexOf(v) === i) as SurveyGoodPoint[]

    if (goodPoints.length === 0) {
      throw new Error('좋은 점을 하나 이상 선택해 주세요.')
    }

    const etcText =
      goodPoints.includes('etc') && typeof body.etcText === 'string'
        ? body.etcText.slice(0, 200)
        : undefined
    const improvement =
      typeof body.improvement === 'string' ? body.improvement.slice(0, 500) : undefined

    const record = await createSurveyResponse({
      goodPoints,
      etcText,
      improvement,
      sessionId: typeof body.sessionId === 'string' ? body.sessionId : undefined,
      device: typeof body.device === 'string' ? body.device : undefined,
      pageUrl: typeof body.pageUrl === 'string' ? body.pageUrl : undefined,
    })

    void notifySurveyToDiscord(goodPoints, etcText, improvement)

    return Response.json({ id: record.id }, { status: 201 })
  } catch (error) {
    return Response.json(
      { error: { message: error instanceof Error ? error.message : '설문을 저장하지 못했습니다.' } },
      { status: 400 },
    )
  }
}
