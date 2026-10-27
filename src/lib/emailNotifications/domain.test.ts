import { describe, expect, it } from 'vitest'
import { nextScheduleSlot, normalizeEmail, scheduleSlot, shouldAskFrequency } from './domain'
describe('email policy', () => {
  it('월·금 한국 시간 09:00~21:59에만 같은 날짜의 발송 슬롯을 사용한다', () => {
    expect(scheduleSlot(new Date('2026-10-18T23:59:00Z'))).toBeNull()
    expect(scheduleSlot(new Date('2026-10-19T00:00:00Z'))).toBe('2026-10-19')
    expect(scheduleSlot(new Date('2026-10-19T02:59:00Z'))).toBe('2026-10-19')
    // 예약이 늦게 와도 그날 저녁까지는 보낸다 (2026-10-23 09:00 예약이 16:25에 실행됨)
    expect(scheduleSlot(new Date('2026-10-23T07:25:00Z'))).toBe('2026-10-23')
    expect(scheduleSlot(new Date('2026-10-19T12:59:00Z'))).toBe('2026-10-19')
    expect(scheduleSlot(new Date('2026-10-19T13:00:00Z'))).toBeNull()
    expect(scheduleSlot(new Date('2026-10-20T00:00:00Z'))).toBeNull()
    expect(scheduleSlot(new Date('2026-10-23T00:00:00Z'))).toBe('2026-10-23')
  })
  it('다음 발송일은 창이 닫히기 전 오늘, 그 뒤엔 다음 월·금이다', () => {
    // 2026-10-19 월 · 10-23 금 (한국 시간)
    expect(nextScheduleSlot(new Date('2026-10-18T22:00:00Z'))).toBe('2026-10-19') // 월 07:00
    expect(nextScheduleSlot(new Date('2026-10-19T12:59:00Z'))).toBe('2026-10-19') // 월 21:59
    expect(nextScheduleSlot(new Date('2026-10-19T13:00:00Z'))).toBe('2026-10-23') // 월 22:00
    expect(nextScheduleSlot(new Date('2026-10-20T00:00:00Z'))).toBe('2026-10-23') // 화
    expect(nextScheduleSlot(new Date('2026-10-23T14:00:00Z'))).toBe('2026-10-26') // 금 23:00
    expect(nextScheduleSlot(new Date('2026-10-24T16:00:00Z'))).toBe('2026-10-26') // 일 01:00
  })
  it('발송 횟수와 무관하게 자동 빈도 설문을 보내지 않는다', () => {
    expect([0,1,2,3,100].map(shouldAskFrequency)).toEqual([false,false,false,false,false])
  })
  it('이메일 정규화와 헤더 삽입 방지를 적용한다', () => {
    expect(normalizeEmail(' Test+movie@Example.com ')).toBe('test+movie@example.com')
    expect(normalizeEmail('test@example.com\r\nBcc: other@example.com')).toBeNull()
    expect(normalizeEmail(null)).toBeNull()
  })
})
