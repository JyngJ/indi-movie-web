// 재방문자 피드백 설문 v2 — 잘 쓰고 계세요?(verdict) → 좋은 점 | 아쉬운 점 (객관식, 후속 입력)
// v1의 주관식(improvement)은 제거 — 과거 응답 호환을 위해 입력 타입에만 남김.

export const SURVEY_GOOD_POINTS = [
  { value: 'map_overview', label: '지도로 한눈에 보여서 편해요' },
  { value: 'map_compare', label: '여러 극장을 비교하기 좋아요' },
  { value: 'films_curation', label: '상영작 탭 큐레이션·추천이 좋아요' },
  { value: 'films_catch', label: '놓칠 뻔한 상영을 발견했어요' },
  { value: 'etc', label: '기타' },
] as const

export const SURVEY_BAD_POINTS = [
  { value: 'region_lack', label: '원하는 지역에 극장 정보가 부족해요' },
  { value: 'info_stale', label: '상영 정보가 부정확하거나 늦어요' },
  { value: 'map_slow', label: '지도가 무겁거나 느려요' },
  { value: 'filter_confusing', label: '필터·검색이 헷갈려요' },
  { value: 'movie_missing', label: '찾는 영화가 없어요' },
  { value: 'etc', label: '기타' },
] as const

export type SurveyGoodPoint = (typeof SURVEY_GOOD_POINTS)[number]['value']
export type SurveyBadPoint = (typeof SURVEY_BAD_POINTS)[number]['value']
export type SurveyVerdict = 'good' | 'bad'

export interface CreateSurveyInput {
  verdict: SurveyVerdict
  goodPoints: SurveyGoodPoint[]
  badPoints: SurveyBadPoint[]
  etcText?: string
  movieMissingText?: string
  /** v1 호환 — 현재 UI에서는 수집하지 않음 */
  improvement?: string
  sessionId?: string
  device?: string
  pageUrl?: string
}

export function isSurveyGoodPoint(value: string): value is SurveyGoodPoint {
  return SURVEY_GOOD_POINTS.some((g) => g.value === value)
}

export function isSurveyBadPoint(value: string): value is SurveyBadPoint {
  return SURVEY_BAD_POINTS.some((g) => g.value === value)
}

export function surveyGoodPointLabel(value: string): string {
  return SURVEY_GOOD_POINTS.find((g) => g.value === value)?.label ?? value
}

export function surveyBadPointLabel(value: string): string {
  return SURVEY_BAD_POINTS.find((g) => g.value === value)?.label ?? value
}
