import { describe, expect, it } from 'vitest'
import { initialScreeningDate } from './initialScreeningDate'

const days = new Set(['2026-10-30', '2026-10-31', '2026-11-02'])
const late = new Date('2026-10-30T23:49:00+09:00')

describe('상세 첫 상영일 선택', () => {
  it('늦게 열어 오늘 회차가 모두 끝났으면 다음 날을 선택한다', () => {
    expect(initialScreeningDate(days, [
      { showTime: '11:15', endTime: '12:54' },
      { showTime: '15:05', endTime: '16:44' },
      { showTime: '17:00', endTime: '18:39' },
    ], late)).toBe('2026-10-31')
  })

  it('내일 상영이 없으면 가장 빠른 다음 상영일을 선택한다', () => {
    expect(initialScreeningDate(new Set(['2026-11-02', '2026-10-30']), [
      { showTime: '17:00', endTime: '18:39' },
    ], late)).toBe('2026-11-02')
  })

  it.each(['23:50', '22:30'])('예정 또는 상영 중인 회차(%s)가 있으면 오늘을 유지한다', (showTime) => {
    expect(initialScreeningDate(days, [{ showTime, endTime: '23:59' }], late)).toBe('2026-10-30')
  })

  it('종료 시각과 같아지면 다음 상영일을 선택한다', () => {
    expect(initialScreeningDate(days, [{ showTime: '22:00', endTime: '23:49' }], late)).toBe('2026-10-31')
  })

  it('자정을 넘기는 회차는 완료로 판정하지 않는다', () => {
    expect(initialScreeningDate(days, [{ showTime: '23:00', endTime: '01:00' }], late)).toBe('2026-10-30')
  })

  it('종료 시각이 없으면 기존 시간표 기준인 시작 후 120분으로 판단한다', () => {
    expect(initialScreeningDate(days, [{ showTime: '21:00' }], late)).toBe('2026-10-31')
    expect(initialScreeningDate(days, [{ showTime: '23:00' }], late)).toBe('2026-10-30')
  })

  it('오늘 회차가 없을 때도 다음 상영일을 선택한다', () => {
    expect(initialScreeningDate(days, [], late)).toBe('2026-10-31')
  })

  it('다음 상영이 없으면 날짜를 임의로 만들지 않는다', () => {
    expect(initialScreeningDate(new Set(['2026-10-30']), [], late)).toBeUndefined()
  })

  it('실행 환경의 시간대와 무관하게 KST 날짜를 사용한다', () => {
    expect(initialScreeningDate(days, [], new Date('2026-10-30T15:30:00Z'))).toBe('2026-11-02')
  })
})
