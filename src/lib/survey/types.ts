// 재방문자 피드백 설문 — 좋은 점(객관식) + 개선할 점(주관식)

export const SURVEY_GOOD_POINTS = [
  { value: 'map_overview', label: '지도로 한눈에 보여서 편해요' },
  { value: 'map_compare', label: '여러 극장을 비교하기 좋아요' },
  { value: 'films_curation', label: '상영작 탭 큐레이션·추천이 좋아요' },
  { value: 'films_catch', label: '놓칠 뻔한 상영을 발견했어요' },
  { value: 'etc', label: '기타' },
] as const

export type SurveyGoodPoint = (typeof SURVEY_GOOD_POINTS)[number]['value']

export interface CreateSurveyInput {
  goodPoints: SurveyGoodPoint[]
  etcText?: string
  improvement?: string
  sessionId?: string
  device?: string
  pageUrl?: string
}

export function isSurveyGoodPoint(value: string): value is SurveyGoodPoint {
  return SURVEY_GOOD_POINTS.some((g) => g.value === value)
}

export function surveyGoodPointLabel(value: string): string {
  return SURVEY_GOOD_POINTS.find((g) => g.value === value)?.label ?? value
}
