import { describe, expect, it } from 'vitest'
import {
  countPastScreeningDays,
  pastScreeningDateLabel,
  pastScreeningSentence,
  pastTheaterPeriodLabel,
  summarizePastScreenings,
  toPastScreeningView,
  type PastScreeningDay,
} from './pastScreenings'

const today = '2026-11-16'
const row = (theaterId: string, showDate: string, showCount = 2, region = '서울'): PastScreeningDay => ({
  theaterId, theaterName: `극장${theaterId}`, region, showDate, showCount,
})

describe('summarizePastScreenings', () => {
  it('기록이 없거나 오늘 이후뿐이면 null', () => {
    expect(summarizePastScreenings([], today)).toBeNull()
    expect(summarizePastScreenings([row('a', today), row('a', '2026-11-20')], today)).toBeNull()
  })

  it('날짜 수는 극장과 무관하게 세고, 회차는 더한다', () => {
    const s = summarizePastScreenings([
      row('a', '2026-10-13', 3),
      row('b', '2026-10-13', 1, '부산'),
      row('a', '2026-10-14', 2),
      row('a', '2026-11-20', 9), // 오늘 이후 — 제외
    ], today)!
    expect(s.days).toBe(2)
    expect(s.shows).toBe(6)
    expect(s.firstDate).toBe('2026-10-13')
    expect(s.lastDate).toBe('2026-10-14')
  })

  it('극장은 마지막 상영이 늦은 순, 지역은 극장 수가 많은 순', () => {
    const s = summarizePastScreenings([
      row('a', '2026-10-13'),
      row('b', '2026-11-01', 1, '부산'),
      row('c', '2026-10-20'),
    ], today)!
    expect(s.theaters.map((t) => t.id)).toEqual(['b', 'c', 'a'])
    expect(s.regions).toEqual([{ region: '서울', theaters: 2 }, { region: '부산', theaters: 1 }])
  })

  it('극장별 첫·마지막 날과 날 수', () => {
    const s = summarizePastScreenings([row('a', '2026-10-20'), row('a', '2026-10-13'), row('a', '2026-10-15')], today)!
    expect(s.theaters[0]).toMatchObject({ firstDate: '2026-10-13', lastDate: '2026-10-20', days: 3 })
  })
})

describe('countPastScreeningDays', () => {
  it('영화별 상영한 날 수 — 같은 날 여러 극장은 하루, 오늘 이후는 제외', () => {
    const m = countPastScreeningDays([
      { movieId: 'x', showDate: '2026-10-13' },
      { movieId: 'x', showDate: '2026-10-13' },
      { movieId: 'x', showDate: '2026-10-14' },
      { movieId: 'x', showDate: today },
      { movieId: 'y', showDate: '2026-10-01' },
    ], today)
    expect(m.get('x')).toBe(2)
    expect(m.get('y')).toBe(1)
  })
})

describe('문구', () => {
  it('날짜는 같은 해면 연도를 빼고 요일을 붙인다', () => {
    expect(pastScreeningDateLabel('2026-10-13', today)).toBe('10월 13일 (화)')
    expect(pastScreeningDateLabel('2025-12-31', today)).toBe('2025년 12월 31일 (수)')
  })

  it('요약 문장 — 기간·지역·날 수·회차', () => {
    const s = summarizePastScreenings([
      row('a', '2026-10-13', 3),
      row('b', '2026-10-14', 1, '부산'),
    ], today)!
    expect(pastScreeningSentence(s, today)).toBe('10월 13일 (화)부터 10월 14일 (수)까지 부산 1곳 · 서울 1곳에서 2일, 4회 상영했어요') // 극장 수가 같으면 가나다순
  })

  it('지역이 넷 이상이면 상위 셋 + 전국 합계', () => {
    const s = summarizePastScreenings([
      row('a', '2026-10-13', 1, '서울'), row('b', '2026-10-13', 1, '서울'),
      row('c', '2026-10-13', 1, '부산'), row('d', '2026-10-13', 1, '대구'), row('e', '2026-10-13', 1, '광주'),
    ], today)!
    expect(pastScreeningSentence(s, today)).toBe('10월 13일 (화)에 전국 5곳 (서울 2곳 · 광주 1곳 · 대구 1곳 등)에서 1일, 5회 상영했어요')
  })

  it('하루뿐이면 "~에", 회차를 모르면 날 수만', () => {
    const s = summarizePastScreenings([row('a', '2026-10-13', 0)], today)!
    expect(pastScreeningSentence(s, today)).toBe('10월 13일 (화)에 서울 1곳에서 1일 상영했어요')
  })

  it('극장 줄 — 하루면 날짜만, 여러 날이면 기간 · 날 수', () => {
    const s = summarizePastScreenings([row('a', '2026-10-13'), row('a', '2026-10-20'), row('b', '2026-10-15')], today)!
    expect(pastTheaterPeriodLabel(s.theaters[0], today)).toBe('10월 13일 (화) ~ 10월 20일 (화) · 2일')
    expect(pastTheaterPeriodLabel(s.theaters[1], today)).toBe('10월 15일 (목)')
  })
})

describe('toPastScreeningView', () => {
  it('상한을 넘는 극장은 접고 수만 남긴다', () => {
    const rows = ['a', 'b', 'c'].map((id, i) => row(id, `2026-10-1${i}`))
    const v = toPastScreeningView(summarizePastScreenings(rows, today)!, today, 2)
    expect(v.theaters.map((t) => t.id)).toEqual(['c', 'b'])
    expect(v.moreCount).toBe(1)
    expect(v.sentence).toContain('상영했어요')
  })
})
