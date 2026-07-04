// ─────────────────────────────────────────────
// 이번 주가 마지막(막바지 상영) 배지 문구
// DB 캐시(curation_cache.last_week_films)의 badgeText는 스크립트 실행 시점에
// 문자열로 고정되므로, 카피 변경이 배포 즉시 반영되도록 daysLeft 숫자에서
// 클라이언트가 매번 새로 문구를 생성한다.
// ─────────────────────────────────────────────

/** D-n 구간은 "종영" 단정 대신 확인된 사실(막바지 상영 중)만 전달한다.
 *  daysLeft 0은 오늘 시간표까지 확인된 상태라 "오늘이 마지막"을 의도적으로 유지. */
export function getLastWeekBadgeText(daysLeft: number): string {
  return daysLeft === 0 ? '오늘이 마지막' : `D-${daysLeft} 막바지 상영`
}
