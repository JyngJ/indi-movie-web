// ─────────────────────────────────────────────
// 한국 공휴일 판정 — 순수 함수.
//
// 날짜 탭이 토·일·공휴일을 색으로 구분한다(DateBar·DetailDateTabs 공통 규칙).
// 양력 고정 공휴일은 규칙으로, 음력·대체 공휴일은 해마다 날짜가 달라 표로 둔다.
// 표에 없는 해의 음력 공휴일은 평일로 나온다 — 해가 바뀌기 전에 한 줄 추가할 것.
// ─────────────────────────────────────────────

/** 양력 고정 공휴일 "MM-DD" — 신정·삼일절·어린이날·현충일·광복절·개천절·한글날·성탄절 */
const FIXED = new Set(['01-01', '03-01', '05-05', '06-06', '08-15', '10-03', '10-09', '12-25'])

/** 음력(설날·부처님오신날·추석)과 대체 공휴일 — 관보 공고 기준 */
const BY_YEAR: Record<string, readonly string[]> = {
  '2026': [
    '2026-02-16', '2026-02-17', '2026-02-18', // 설날 연휴
    '2026-03-02',                             // 삼일절 대체
    '2026-05-24', '2026-05-25',               // 부처님오신날 · 대체
    '2026-06-03',                             // 전국동시지방선거
    '2026-08-17',                             // 광복절 대체
    '2026-09-24', '2026-09-25', '2026-09-26', // 추석 연휴
    '2026-10-05',                             // 개천절 대체
  ],
  '2027': [
    '2027-02-06', '2027-02-07', '2027-02-08', '2027-02-09', // 설날 연휴 · 대체
    '2027-05-13',                                           // 부처님오신날
    '2027-08-16',                                           // 광복절 대체
    '2027-09-14', '2027-09-15', '2027-09-16',               // 추석 연휴
    '2027-10-04', '2027-10-11',                             // 개천절 · 한글날 대체
    '2027-12-27',                                           // 성탄절 대체
  ],
}

/** @param iso "YYYY-MM-DD" */
export function isKoreanPublicHoliday(iso: string): boolean {
  if (FIXED.has(iso.slice(5, 10))) return true
  return BY_YEAR[iso.slice(0, 4)]?.includes(iso) ?? false
}

export type CalendarDayKind = 'weekday' | 'saturday' | 'sunday' | 'holiday'

/**
 * 날짜 탭 색을 고르는 종류. 공휴일이 토요일과 겹치면 공휴일이 이긴다(빨강).
 * @param iso "YYYY-MM-DD"
 */
export function calendarDayKind(iso: string): CalendarDayKind {
  const dow = new Date(`${iso}T12:00:00Z`).getUTCDay()
  if (dow === 0) return 'sunday'
  if (isKoreanPublicHoliday(iso)) return 'holiday'
  if (dow === 6) return 'saturday'
  return 'weekday'
}
