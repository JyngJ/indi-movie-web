import { createSurveyResponse } from '@/lib/survey/store'
import { notifySurveyToDiscord } from '@/lib/survey/discord'
import {
  isSurveyBadPoint,
  isSurveyGoodPoint,
  type SurveyBadPoint,
  type SurveyGoodPoint,
  type SurveyVerdict,
} from '@/lib/survey/types'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))

    const verdict: SurveyVerdict = body.verdict === 'bad' ? 'bad' : 'good'

    const rawGood: unknown[] = Array.isArray(body.goodPoints) ? body.goodPoints : []
    const goodPoints = rawGood
      .map(String)
      .filter((v, i, arr) => isSurveyGoodPoint(v) && arr.indexOf(v) === i) as SurveyGoodPoint[]

    const rawBad: unknown[] = Array.isArray(body.badPoints) ? body.badPoints : []
    const badPoints = rawBad
      .map(String)
      .filter((v, i, arr) => isSurveyBadPoint(v) && arr.indexOf(v) === i) as SurveyBadPoint[]

    if (verdict === 'good' && goodPoints.length === 0) {
      throw new Error('좋은 점을 하나 이상 선택해 주세요.')
    }
    if (verdict === 'bad' && badPoints.length === 0) {
      throw new Error('아쉬운 점을 하나 이상 선택해 주세요.')
    }

    const selected = verdict === 'good' ? goodPoints : badPoints
    const etcText =
      selected.includes('etc' as never) && typeof body.etcText === 'string'
        ? body.etcText.slice(0, 200)
        : undefined
    const movieMissingText =
      badPoints.includes('movie_missing') && typeof body.movieMissingText === 'string'
        ? body.movieMissingText.slice(0, 200)
        : undefined

    const record = await createSurveyResponse({
      verdict,
      goodPoints,
      badPoints,
      etcText,
      movieMissingText,
      sessionId: typeof body.sessionId === 'string' ? body.sessionId : undefined,
      device: typeof body.device === 'string' ? body.device : undefined,
      pageUrl: typeof body.pageUrl === 'string' ? body.pageUrl : undefined,
    })

    void notifySurveyToDiscord(verdict, goodPoints, badPoints, etcText, movieMissingText)

    return Response.json({ id: record.id }, { status: 201 })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : '설문 저장에 실패했습니다.' },
      { status: 400 },
    )
  }
}
