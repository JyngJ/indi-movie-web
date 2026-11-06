import { describe, expect, it } from 'vitest'
import {
  collectActiveDates,
  dateForMovie,
  filterMovieGroups,
  groupShowtimesByMovie,
  scheduleDates,
  showtimeKind,
} from './schedule'

const st = (id: string, movieId: string, showTime: string, extra: Partial<{ endTime: string | null; seatAvailable: number; seatTotal: number }> = {}) => ({
  id, movieId, showTime, endTime: null, seatAvailable: 50, seatTotal: 100, ...extra,
})
const notToday = { isToday: false, nowMinutes: 0 }

describe('showtimeKind', () => {
  it('오늘만 지난 회차와 상영 중을 가른다', () => {
    const s = st('a', 'm', '10:00', { endTime: '12:00' })
    expect(showtimeKind(s, { isToday: true, nowMinutes: 13 * 60 })).toBe('ended')
    expect(showtimeKind(s, { isToday: true, nowMinutes: 11 * 60 })).toBe('nowplaying')
    expect(showtimeKind(s, { isToday: false, nowMinutes: 13 * 60 })).toBe('normal')
  })

  it('종료 시각이 없으면 시작 + 120분으로 본다', () => {
    expect(showtimeKind(st('a', 'm', '10:00'), { isToday: true, nowMinutes: 11 * 60 + 59 })).toBe('nowplaying')
    expect(showtimeKind(st('a', 'm', '10:00'), { isToday: true, nowMinutes: 12 * 60 })).toBe('ended')
  })

  it('매진 · 잔여석 적음 · 심야 순으로 판정한다', () => {
    expect(showtimeKind(st('a', 'm', '22:00', { seatAvailable: 0 }), notToday)).toBe('soldout')
    expect(showtimeKind(st('a', 'm', '22:00', { seatAvailable: 10 }), notToday)).toBe('low')
    expect(showtimeKind(st('a', 'm', '21:00'), notToday)).toBe('late')
  })

  it('좌석 정보가 없는 0/0은 매진이 아니다', () => {
    expect(showtimeKind(st('a', 'm', '14:00', { seatAvailable: 0, seatTotal: 0 }), notToday)).toBe('normal')
  })
})

describe('groupShowtimesByMovie', () => {
  const movies = [{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }]

  it('영화별로 묶고 첫 회차 시각 순으로 놓는다', () => {
    const groups = groupShowtimesByMovie(movies, [st('a', 'm2', '18:00'), st('b', 'm1', '20:00'), st('c', 'm2', '11:00')], notToday)
    expect(groups.map((g) => g.movie.id)).toEqual(['m2', 'm1'])
    expect(groups[0].showtimes.map((s) => s.id)).toEqual(['c', 'a'])
  })

  it('오늘은 볼 수 있는 영화 → 남은 회차 전부 매진 → 전부 종료 순', () => {
    const groups = groupShowtimesByMovie(movies, [
      st('a', 'm1', '09:00', { endTime: '10:00' }),
      st('b', 'm2', '19:00', { seatAvailable: 0 }),
      st('c', 'm3', '20:00'),
    ], { isToday: true, nowMinutes: 12 * 60 })
    expect(groups.map((g) => g.movie.id)).toEqual(['m3', 'm2', 'm1'])
  })

  it('목록에 없는 영화의 회차는 버린다', () => {
    expect(groupShowtimesByMovie([{ id: 'm1' }], [st('a', 'zz', '10:00')], notToday)).toEqual([])
  })
})

describe('날짜', () => {
  it('scheduleDates는 오늘부터 연속된 날짜를 만든다', () => {
    expect(scheduleDates('2026-12-30', 3)).toEqual(['2026-12-30', '2026-12-31', '2027-01-01'])
  })

  it('collectActiveDates는 영화별 상영일을 합친다', () => {
    const set = collectActiveDates([{ availableDates: new Set(['2026-11-06']) }, { availableDates: new Set(['2026-11-08', '2026-11-06']) }])
    expect([...set].sort()).toEqual(['2026-11-06', '2026-11-08'])
  })

  it('dateForMovie는 지금 날짜 → 그 뒤 첫 상영일 → 마지막 상영일 순으로 고른다', () => {
    const dates = new Set(['2026-11-06', '2026-11-09'])
    expect(dateForMovie(dates, '2026-11-06')).toBe('2026-11-06')
    expect(dateForMovie(dates, '2026-11-07')).toBe('2026-11-09')
    expect(dateForMovie(dates, '2026-11-10')).toBe('2026-11-09')
    expect(dateForMovie(new Set(), '2026-11-10')).toBeUndefined()
  })
})

describe('filterMovieGroups', () => {
  const groups = [
    { movie: { id: 'a', genre: ['드라마'], nation: '한국' }, showtimes: [st('1', 'a', '10:00')] },
    { movie: { id: 'b', genre: ['다큐멘터리'], nation: '프랑스, 한국' }, showtimes: [st('2', 'b', '10:00', { seatAvailable: 0 })] },
  ]

  it('조건이 없으면 그대로 둔다', () => {
    expect(filterMovieGroups(groups, { genres: [], nations: [], bookable: false }, notToday)).toHaveLength(2)
  })

  it('국가는 여러 나라 중 하나만 맞아도 통과한다', () => {
    expect(filterMovieGroups(groups, { genres: [], nations: ['프랑스'], bookable: false }, notToday).map((g) => g.movie.id)).toEqual(['b'])
  })

  it('예매 가능만 보기는 고를 수 있는 회차가 있는 영화만 남긴다', () => {
    expect(filterMovieGroups(groups, { genres: [], nations: [], bookable: true }, notToday).map((g) => g.movie.id)).toEqual(['a'])
  })
})
