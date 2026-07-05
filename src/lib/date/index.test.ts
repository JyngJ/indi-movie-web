import { describe, expect, it } from 'vitest'
import { addDaysIso, formatLocalDate, formatLocalTimeHHMM, toKstIsoDate } from './index'

describe('addDaysIso', () => {
  it('일수를 더한다', () => {
    expect(addDaysIso('2026-07-05', 1)).toBe('2026-07-06')
    expect(addDaysIso('2026-07-05', 13)).toBe('2026-07-18')
  })

  it('음수 일수(과거)도 처리한다', () => {
    expect(addDaysIso('2026-07-05', -7)).toBe('2026-06-28')
  })

  it('월·연 경계를 넘는다', () => {
    expect(addDaysIso('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDaysIso('2025-12-31', 1)).toBe('2026-01-01')
  })

  it('윤년 2월을 처리한다', () => {
    expect(addDaysIso('2024-02-28', 1)).toBe('2024-02-29')
    expect(addDaysIso('2024-02-29', 1)).toBe('2024-03-01')
  })
})

describe('formatLocalDate', () => {
  it('로컬 타임존 기준 YYYY-MM-DD를 만든다', () => {
    // new Date(y, m, d)는 로컬 타임존 생성자이므로 타임존 무관하게 성립
    expect(formatLocalDate(new Date(2026, 6, 5))).toBe('2026-07-05')
  })

  it('한 자리 월·일을 0으로 패딩한다', () => {
    expect(formatLocalDate(new Date(2026, 0, 3))).toBe('2026-01-03')
  })
})

describe('toKstIsoDate', () => {
  it('UTC 자정 직전은 KST로는 다음 날이다', () => {
    // 2026-07-05T20:00:00Z == 2026-07-06T05:00 KST
    expect(toKstIsoDate(new Date('2026-07-05T20:00:00Z'))).toBe('2026-07-06')
  })

  it('UTC 오전은 KST와 같은 날짜다', () => {
    expect(toKstIsoDate(new Date('2026-07-05T03:00:00Z'))).toBe('2026-07-05')
  })
})

describe('formatLocalTimeHHMM', () => {
  it('로컬 시각을 HH:MM으로 만든다', () => {
    expect(formatLocalTimeHHMM(new Date(2026, 6, 5, 14, 30))).toBe('14:30')
  })

  it('한 자리 시·분을 0으로 패딩한다', () => {
    expect(formatLocalTimeHHMM(new Date(2026, 6, 5, 9, 5))).toBe('09:05')
  })
})
