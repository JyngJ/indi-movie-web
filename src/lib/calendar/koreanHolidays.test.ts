import { describe, expect, it } from 'vitest'
import { calendarDayKind, isKoreanPublicHoliday } from './koreanHolidays'

describe('isKoreanPublicHoliday', () => {
  it('양력 고정 공휴일을 잡는다', () => {
    expect(isKoreanPublicHoliday('2026-10-09')).toBe(true)   // 한글날
    expect(isKoreanPublicHoliday('2031-12-25')).toBe(true)   // 표에 없는 해도 규칙으로
  })
  it('표에 있는 음력·대체 공휴일을 잡는다', () => {
    expect(isKoreanPublicHoliday('2026-09-25')).toBe(true)   // 추석
    expect(isKoreanPublicHoliday('2026-10-05')).toBe(true)   // 개천절 대체
  })
  it('평일은 공휴일이 아니다', () => {
    expect(isKoreanPublicHoliday('2026-10-07')).toBe(false)
  })
})

describe('calendarDayKind', () => {
  it('요일과 공휴일을 구분한다 — 부산국제영화제 회기', () => {
    expect(calendarDayKind('2026-10-06')).toBe('weekday')    // 화
    expect(calendarDayKind('2026-10-09')).toBe('holiday')    // 금 · 한글날
    expect(calendarDayKind('2026-10-10')).toBe('saturday')
    expect(calendarDayKind('2026-10-11')).toBe('sunday')
  })
  it('토요일과 겹친 공휴일은 공휴일로 본다', () => {
    expect(calendarDayKind('2027-10-09')).toBe('holiday')    // 토 · 한글날
  })
})
