import type { LastWeekConfidence } from './types'

/**
 * 리드타임 판정과 KOBIS 교차검증을 결합해 최종 확신도를 정한다.
 * leadtimeConfirmed가 false면 KOBIS 결과와 무관하게 무조건 'likely'.
 * KOBIS 매칭 자체가 안 되면(예술관 다수가 미가입) 리드타임 결과만으로 confirmed —
 * KOBIS는 "있으면 보너스"이지 필수 게이트가 아니다.
 * 매칭은 됐는데 스크린 수가 늘거나 유지되는 추세면(=종영 반대 신호) 'likely'로 낮춘다.
 */
export function combineConfidence(
  leadtimeConfirmed: boolean,
  kobisMatched: boolean,
  kobisScreenCountDeclining: boolean,
): LastWeekConfidence {
  if (!leadtimeConfirmed) return 'likely'
  if (!kobisMatched) return 'confirmed'
  return kobisScreenCountDeclining ? 'confirmed' : 'likely'
}
