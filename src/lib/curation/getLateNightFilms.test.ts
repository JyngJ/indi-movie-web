import { describe, expect, it } from 'vitest'
import { LATE_NIGHT_START_TIME } from '@/lib/catalog/lateNight'
import { fixtureMovie } from './fixtures'
import {
  dayOfWeekLabel,
  formatLateNightCaption,
  getLateNightFilms,
  MIN_LATE_NIGHT_FILMS,
} from './getLateNightFilms'
import type { LateNightCandidate } from './types'

// 2026-07-05 = 일요일
const TODAY = '2026-07-05'
const END = '2026-07-12'

function candidate(overrides: Partial<LateNightCandidate> & { movieId: string }): LateNightCandidate {
  const { movieId, ...rest } = overrides
  return {
    movie: fixtureMovie({ id: movieId, title: `영화 ${movieId}` }),
    theaterId: 't1',
    theaterName: '아트나인',
    theaterCity: '서울',
    showDate: TODAY,
    showTime: '23:00:00',
    ...rest,
  }
}

/** 서로 다른 영화 n편의 심야 후보 생성 — threshold 채우기용 */
function lateCandidates(n: number): LateNightCandidate[] {
  return Array.from({ length: n }, (_, i) => candidate({ movieId: `m${i + 1}` }))
}

describe('getLateNightFilms', () => {
  it('기준시각(23:00) 이후 회차만 심야로 판정한다 — 경계 포함', () => {
    const films = getLateNightFilms(
      [
        ...lateCandidates(2),
        candidate({ movieId: 'm3', showTime: '23:00:00' }), // 정확히 23:00 — 포함
        candidate({ movieId: 'm4', showTime: '22:59:00' }), // 기준 전 — 제외
        candidate({ movieId: 'm5', showTime: '19:30:00' }), // 일반 회차 — 제외
      ],
      TODAY,
      END,
    )
    expect(films.map((f) => f.movie.id).sort()).toEqual(['m1', 'm2', 'm3'])
  })

  it('자정 넘는 00:00~05:00대 회차도 심야로 포함한다 (05:00 경계 제외)', () => {
    const films = getLateNightFilms(
      [
        ...lateCandidates(2),
        candidate({ movieId: 'm3', showDate: '2026-07-06', showTime: '00:30:00' }), // 포함
        candidate({ movieId: 'm4', showDate: '2026-07-06', showTime: '04:59:00' }), // 포함
        candidate({ movieId: 'm5', showDate: '2026-07-06', showTime: '05:00:00' }), // 경계 — 제외
      ],
      TODAY,
      END,
    )
    expect(films.map((f) => f.movie.id).sort()).toEqual(['m1', 'm2', 'm3', 'm4'])
  })

  it('기간(오늘~D+7) 밖 회차는 무시한다', () => {
    const films = getLateNightFilms(
      [
        ...lateCandidates(2),
        candidate({ movieId: 'm3', showDate: '2026-07-04' }), // 어제 — 제외
        candidate({ movieId: 'm4', showDate: '2026-07-13' }), // D+8 — 제외
        candidate({ movieId: 'm5', showDate: END }),          // D+7 — 포함
      ],
      TODAY,
      END,
    )
    expect(films.map((f) => f.movie.id).sort()).toEqual(['m1', 'm2', 'm5'])
  })

  it('nowTime 지정 시 오늘 이미 지난 회차를 제외한다 (자정 넘어 지난 새벽 회차 포함)', () => {
    const films = getLateNightFilms(
      [
        ...lateCandidates(2),
        candidate({ movieId: 'm3', showTime: '23:10:00' }),                         // 오늘 23:10 — 포함
        candidate({ movieId: 'm4', showTime: '00:40:00' }),                         // 오늘 새벽 00:40 — 이미 지남, 제외
        candidate({ movieId: 'm5', showDate: '2026-07-06', showTime: '00:40:00' }), // 내일 새벽 — 포함
      ],
      TODAY,
      END,
      '14:00',
    )
    expect(films.map((f) => f.movie.id).sort()).toEqual(['m1', 'm2', 'm3', 'm5'])
  })

  it(`영화 ${MIN_LATE_NIGHT_FILMS}편 미만이면 빈 배열을 반환한다 (섹션 숨김)`, () => {
    expect(getLateNightFilms(lateCandidates(MIN_LATE_NIGHT_FILMS - 1), TODAY, END)).toEqual([])
    expect(getLateNightFilms(lateCandidates(MIN_LATE_NIGHT_FILMS), TODAY, END)).toHaveLength(
      MIN_LATE_NIGHT_FILMS,
    )
  })

  it('같은 영화의 심야 회차를 그룹하고 날짜+시간 오름차순으로 정렬한다', () => {
    const films = getLateNightFilms(
      [
        ...lateCandidates(2),
        candidate({ movieId: 'm3', showDate: '2026-07-08', showTime: '23:05:00', theaterName: '씨네인디U' }),
        candidate({ movieId: 'm3', showDate: '2026-07-06', showTime: '00:30:00' }),
        candidate({ movieId: 'm3', showDate: '2026-07-06', showTime: '23:30:00' }),
      ],
      TODAY,
      END,
    )
    const m3 = films.find((f) => f.movie.id === 'm3')!
    expect(m3.showings.map((s) => `${s.showDate} ${s.showTime}`)).toEqual([
      '2026-07-06 00:30',
      '2026-07-06 23:30',
      '2026-07-08 23:05',
    ])
  })

  it('가장 가까운 회차를 가진 영화 순으로 정렬하고, 동률이면 회차 많은 영화 우선', () => {
    const films = getLateNightFilms(
      [
        candidate({ movieId: 'far', showDate: '2026-07-08' }),
        candidate({ movieId: 'near', showDate: '2026-07-06', showTime: '00:30:00' }),
        candidate({ movieId: 'tie-many', showDate: '2026-07-07' }),
        candidate({ movieId: 'tie-many', showDate: '2026-07-09' }),
        candidate({ movieId: 'tie-one', showDate: '2026-07-07' }),
      ],
      TODAY,
      END,
    )
    expect(films.map((f) => f.movie.id)).toEqual(['near', 'tie-many', 'tie-one', 'far'])
  })

  it('심야 기준 시각을 주입할 수 있다 (예: 22:30)', () => {
    const films = getLateNightFilms(
      [
        ...lateCandidates(2),
        candidate({ movieId: 'm3', showTime: '22:40:00' }),
      ],
      TODAY,
      END,
      undefined,
      '22:30',
    )
    expect(films.map((f) => f.movie.id).sort()).toEqual(['m1', 'm2', 'm3'])
    // 기본 기준(23:00)에서는 22:40 회차가 제외돼 2편 → 빈 배열
    expect(
      getLateNightFilms(
        [...lateCandidates(2), candidate({ movieId: 'm3', showTime: '22:40:00' })],
        TODAY,
        END,
        undefined,
        LATE_NIGHT_START_TIME,
      ).map((f) => f.movie.id),
    ).toEqual([])
  })

  it('showTime을 "HH:MM"으로 잘라 반환한다', () => {
    const films = getLateNightFilms(lateCandidates(MIN_LATE_NIGHT_FILMS), TODAY, END)
    expect(films[0].showings[0].showTime).toBe('23:00')
  })
})

describe('dayOfWeekLabel', () => {
  it('ISO 날짜의 요일 한 글자를 반환한다', () => {
    expect(dayOfWeekLabel('2026-07-05')).toBe('일')
    expect(dayOfWeekLabel('2026-07-10')).toBe('금')
    expect(dayOfWeekLabel('2026-07-11')).toBe('토')
  })
})

describe('formatLateNightCaption', () => {
  it('오늘 회차는 "오늘", 이후는 요일 한 글자로 표기한다', () => {
    const [film] = getLateNightFilms(
      [candidate({ movieId: 'm1' }), ...lateCandidates(2).map((c, i) => ({ ...c, movie: fixtureMovie({ id: `x${i}`, title: `x${i}` }) }))],
      TODAY,
      END,
    )
    expect(formatLateNightCaption(film, TODAY)).toBe('오늘 23:00 아트나인')

    const films = getLateNightFilms(
      [
        ...lateCandidates(2),
        candidate({ movieId: 'm3', showDate: '2026-07-10', showTime: '23:30:00', theaterName: '씨네인디U' }),
      ],
      TODAY,
      END,
    )
    const m3 = films.find((f) => f.movie.id === 'm3')!
    expect(formatLateNightCaption(m3, TODAY)).toBe('금 23:30 씨네인디U')
  })

  it('회차가 여러 개면 "· 외 N회"를 붙인다', () => {
    const films = getLateNightFilms(
      [
        ...lateCandidates(2),
        candidate({ movieId: 'm3', showDate: '2026-07-06', showTime: '23:30:00' }),
        candidate({ movieId: 'm3', showDate: '2026-07-08', showTime: '23:05:00' }),
        candidate({ movieId: 'm3', showDate: '2026-07-09', showTime: '00:30:00' }),
      ],
      TODAY,
      END,
    )
    const m3 = films.find((f) => f.movie.id === 'm3')!
    expect(formatLateNightCaption(m3, TODAY)).toBe('월 23:30 아트나인 · 외 2회')
  })
})
