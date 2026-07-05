// ─────────────────────────────────────────────
// 심야 상영 시각 판정 — 순수 도메인 규칙
// showtimes.show_time ("HH:MM" | "HH:MM:SS") 기준
// ─────────────────────────────────────────────

/** 이 시각 이후 시작하면 심야 — store.ts 지도 kind='late' 판정과 동일 기준 */
export const LATE_NIGHT_START_TIME = '23:00'

/** 자정 넘어 이 시각 전에 시작하는 회차(00:30 등)도 심야로 본다 */
export const LATE_NIGHT_END_TIME = '05:00'

/**
 * 심야 회차 여부: show_time >= 기준시각 OR show_time < 05:00.
 * 자정 넘는 회차는 show_date가 실제 시작 캘린더 날짜로 저장된다고 가정한다
 * (예: 금요일 밤 프로그램의 00:40 회차 → show_date는 토요일).
 * @param startTime 심야 기준 시각 — 테스트/실험용 주입 가능
 */
export function isLateNightTime(showTime: string, startTime: string = LATE_NIGHT_START_TIME): boolean {
  return showTime >= startTime || showTime < LATE_NIGHT_END_TIME
}
