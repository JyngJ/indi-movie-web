import type { LastWeekConfidence } from './types'

// ─────────────────────────────────────────────
// 이번 주가 마지막(막바지 상영) 배지 문구
// DB 캐시(curation_cache.last_week_films)의 badgeText는 스크립트 실행 시점에
// 문자열로 고정되므로, 카피 변경이 배포 즉시 반영되도록 daysLeft 숫자에서
// 클라이언트가 매번 새로 문구를 생성한다.
//
// confidence('confirmed' | 'likely')로 문구 강도를 등급화한다 (TASK-06 리드타임 학습 +
// KOBIS 교차검증 결과). daysLeft===0("오늘이 마지막")은 크롤로 확인된 오늘 시간표 기준
// 확정 사실이라 confidence와 무관하게 항상 유지한다.
// ─────────────────────────────────────────────

/** D-n(n>0) 구간은 confirmed일 때만 "종영" 단정, 그 외엔 확인된 사실(막바지 상영 중)만 전달 */
export function getLastWeekBadgeText(daysLeft: number, confidence: LastWeekConfidence): string {
  if (daysLeft === 0) return '오늘이 마지막'
  return confidence === 'confirmed' ? `D-${daysLeft} 종영` : `D-${daysLeft} 막바지 상영`
}
