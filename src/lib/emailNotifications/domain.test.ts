import { describe, expect, it } from 'vitest'
import { normalizeEmail, scheduleSlot, shouldAskFrequency } from './domain'
describe('email policy', () => {
  it('월·금 한국 시간 오전에만 같은 날짜의 발송 슬롯을 사용한다', () => {
    expect(scheduleSlot(new Date('2026-10-18T23:59:00Z'))).toBeNull()
    expect(scheduleSlot(new Date('2026-10-19T00:00:00Z'))).toBe('2026-10-19')
    expect(scheduleSlot(new Date('2026-10-19T02:59:00Z'))).toBe('2026-10-19')
    expect(scheduleSlot(new Date('2026-10-19T03:00:00Z'))).toBeNull()
    expect(scheduleSlot(new Date('2026-10-20T00:00:00Z'))).toBeNull()
    expect(scheduleSlot(new Date('2026-10-23T00:00:00Z'))).toBe('2026-10-23')
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
