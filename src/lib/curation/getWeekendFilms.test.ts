import { describe, expect, it } from 'vitest'
import { fixtureMovie } from './fixtures'
import { formatWeekendCaption, getWeekendFilms, MIN_WEEKEND_FILMS } from './getWeekendFilms'
import type { LateNightCandidate } from './types'

// 2026-07-06 = 월요일, 2026-07-11 = 토요일, 2026-07-12 = 일요일
const MONDAY = '2026-07-06'
const SATURDAY = '2026-07-11'
const SUNDAY = '2026-07-12'

function candidate(overrides: Partial<LateNightCandidate> & { movieId: string }): LateNightCandidate {
  const { movieId, ...rest } = overrides
  return {
    movie: fixtureMovie({ id: movieId, title: `영화 ${movieId}` }),
    theaterId: 't1',
    theaterName: '라이카시네마',
    theaterCity: '서울',
    showDate: SATURDAY,
    showTime: '15:00:00',
    ...rest,
  }
}

function weekendCandidates(n: number): LateNightCandidate[] {
  return Array.from({ length: n }, (_, i) => candidate({ movieId: `m${i + 1}` }))
}

describe('getWeekendFilms', () => {
  it('평일 기준 이번 주 토·일 회차를 모두 포함한다', () => {
    const films = getWeekendFilms(
      [
        ...weekendCandidates(2),
        candidate({ movieId: 'm3', showDate: SUNDAY }),
        candidate({ movieId: 'm4', showDate: '2026-07-13' }), // 다음 주 월 — 제외
        candidate({ movieId: 'm5', showDate: '2026-07-10' }), // 금요일 — 제외
      ],
      MONDAY,
    )
    expect(films.map((f) => f.movie.id).sort()).toEqual(['m1', 'm2', 'm3'])
  })

  it('오늘이 일요일이면 이번 주 토요일은 이미 지났으므로 제외하고 오늘만 포함한다', () => {
    const films = getWeekendFilms(
      [
        ...weekendCandidates(2).map((c) => ({ ...c, showDate: SUNDAY })),
        candidate({ movieId: 'm3', showDate: SUNDAY }),
        candidate({ movieId: 'm4', showDate: SATURDAY }), // 이미 지난 토요일 — 제외
      ],
      SUNDAY,
    )
    expect(films.map((f) => f.movie.id).sort()).toEqual(['m1', 'm2', 'm3'])
  })

  it('nowTime 지정 시 오늘 날짜 회차 중 이미 시작 시각이 지난 회차를 제외한다', () => {
    const films = getWeekendFilms(
      [
        ...weekendCandidates(2).map((c) => ({ ...c, showDate: SATURDAY })),
        candidate({ movieId: 'm3', showDate: SATURDAY, showTime: '20:00:00' }), // 아직 안 지남
        candidate({ movieId: 'm4', showDate: SATURDAY, showTime: '10:00:00' }), // 이미 지남 — 제외
        candidate({ movieId: 'm5', showDate: SUNDAY, showTime: '10:00:00' }),   // 내일이라 필터 안 걸림
      ],
      SATURDAY,
      '14:00',
    )
    expect(films.map((f) => f.movie.id).sort()).toEqual(['m1', 'm2', 'm3', 'm5'])
  })

  it(`영화 ${MIN_WEEKEND_FILMS}편 미만이면 빈 배열을 반환한다 (섹션 숨김)`, () => {
    expect(getWeekendFilms(weekendCandidates(MIN_WEEKEND_FILMS - 1), MONDAY)).toEqual([])
    expect(getWeekendFilms(weekendCandidates(MIN_WEEKEND_FILMS), MONDAY)).toHaveLength(MIN_WEEKEND_FILMS)
  })

  it('가장 가까운 회차를 가진 영화 순으로 정렬한다', () => {
    const films = getWeekendFilms(
      [
        candidate({ movieId: 'far', showDate: SUNDAY, showTime: '20:00:00' }),
        candidate({ movieId: 'near', showDate: SATURDAY, showTime: '10:00:00' }),
        candidate({ movieId: 'mid', showDate: SATURDAY, showTime: '20:00:00' }),
      ],
      MONDAY,
    )
    expect(films.map((f) => f.movie.id)).toEqual(['near', 'mid', 'far'])
  })

  it('formatWeekendCaption — 오늘 날짜면 "오늘", 아니면 요일 라벨을 쓴다', () => {
    const films = getWeekendFilms(
      [
        ...weekendCandidates(2).map((c) => ({ ...c, showDate: SATURDAY })),
        candidate({ movieId: 'm3', showDate: SATURDAY, showTime: '15:00:00' }),
        candidate({ movieId: 'm3', showDate: SUNDAY, showTime: '19:00:00' }),
      ],
      SATURDAY,
    )
    const m3 = films.find((f) => f.movie.id === 'm3')!
    expect(formatWeekendCaption(m3, SATURDAY)).toBe('오늘 15:00 라이카시네마 · 외 1회')
  })
})
