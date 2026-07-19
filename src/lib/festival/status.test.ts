import { describe, expect, it } from 'vitest'
import { getFestivalDateLabel, getFestivalStatus } from './status'

describe('getFestivalStatus', () => {
  it('오늘이 start_date 이전이면 upcoming', () => {
    expect(getFestivalStatus('2026-08-10', '2026-08-12', '2026-08-05')).toBe('upcoming')
  })
  it('오늘이 start_date면 ongoing(경계 포함)', () => {
    expect(getFestivalStatus('2026-08-10', '2026-08-12', '2026-08-10')).toBe('ongoing')
  })
  it('오늘이 회기 중이면 ongoing', () => {
    expect(getFestivalStatus('2026-08-10', '2026-08-12', '2026-08-11')).toBe('ongoing')
  })
  it('오늘이 end_date면 ongoing(경계 포함)', () => {
    expect(getFestivalStatus('2026-08-10', '2026-08-12', '2026-08-12')).toBe('ongoing')
  })
  it('오늘이 end_date 이후면 ended', () => {
    expect(getFestivalStatus('2026-08-10', '2026-08-12', '2026-08-13')).toBe('ended')
  })
  it('start_date === end_date(하루짜리)도 그날은 ongoing', () => {
    expect(getFestivalStatus('2026-08-10', '2026-08-10', '2026-08-10')).toBe('ongoing')
  })
})

describe('getFestivalDateLabel', () => {
  it('ended면 "종료됨"', () => {
    expect(getFestivalDateLabel('ended', '2026-08-10', '2026-08-12', '2026-08-13')).toBe('종료됨')
  })

  it('ongoing + 오늘이 end_date면 "오늘 종료"', () => {
    expect(getFestivalDateLabel('ongoing', '2026-08-10', '2026-08-12', '2026-08-12')).toBe('오늘 종료')
  })
  it('ongoing + 내일이 end_date면 "내일까지"', () => {
    expect(getFestivalDateLabel('ongoing', '2026-08-10', '2026-08-12', '2026-08-11')).toBe('내일까지')
  })
  it('ongoing + 그 외엔 "M월 D일까지"', () => {
    expect(getFestivalDateLabel('ongoing', '2026-08-01', '2026-08-20', '2026-08-05')).toBe('8월 20일까지')
  })

  it('upcoming + 오늘이 start_date면 "오늘 시작"', () => {
    expect(getFestivalDateLabel('upcoming', '2026-08-10', '2026-08-12', '2026-08-10')).toBe('오늘 시작')
  })
  it('upcoming + 내일이 start_date면 "내일 시작"', () => {
    expect(getFestivalDateLabel('upcoming', '2026-08-10', '2026-08-12', '2026-08-09')).toBe('내일 시작')
  })
  it('upcoming + 7일 이내면 "D-N"', () => {
    expect(getFestivalDateLabel('upcoming', '2026-08-10', '2026-08-12', '2026-08-05')).toBe('D-5')
  })
  it('upcoming + 정확히 7일이면 "D-7"(경계 포함)', () => {
    expect(getFestivalDateLabel('upcoming', '2026-08-10', '2026-08-12', '2026-08-03')).toBe('D-7')
  })
  it('upcoming + 7일 초과면 "M월 D일 시작"', () => {
    expect(getFestivalDateLabel('upcoming', '2026-08-10', '2026-08-12', '2026-08-02')).toBe('8월 10일 시작')
  })
})
