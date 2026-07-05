import { describe, expect, it } from 'vitest'
import { fixtureMovie } from './fixtures'
import {
  formatAlmostSoldOutCaption,
  getAlmostSoldOutFilms,
  MIN_ALMOST_SOLD_OUT_FILMS,
} from './getAlmostSoldOutFilms'
import type { AlmostSoldOutCandidate } from './types'

const TODAY = '2026-07-05'
const TOMORROW = '2026-07-06'

function candidate(overrides: Partial<AlmostSoldOutCandidate> & { movieId: string }): AlmostSoldOutCandidate {
  const { movieId, ...rest } = overrides
  return {
    movie: fixtureMovie({ id: movieId, title: `영화 ${movieId}` }),
    theaterId: 't1',
    theaterName: '에무시네마',
    theaterCity: '서울',
    showDate: TODAY,
    showTime: '19:30:00',
    seatAvailable: 5,
    seatTotal: 100,
    ...rest,
  }
}

/** 서로 다른 영화 n편의 매진 임박 후보 생성 — threshold 채우기용 */
function lowCandidates(n: number): AlmostSoldOutCandidate[] {
  return Array.from({ length: n }, (_, i) => candidate({ movieId: `m${i + 1}` }))
}

describe('getAlmostSoldOutFilms', () => {
  it('잔여율 15% 이하(매진 제외) 회차만 매진 임박으로 판정한다', () => {
    const films = getAlmostSoldOutFilms(
      [
        ...lowCandidates(2),
        candidate({ movieId: 'm3', seatAvailable: 15, seatTotal: 100 }), // 정확히 15% — 포함
        candidate({ movieId: 'm4', seatAvailable: 16, seatTotal: 100 }), // 15% 초과 — 제외
        candidate({ movieId: 'm5', seatAvailable: 0, seatTotal: 100 }),  // 매진 — 제외
        candidate({ movieId: 'm6', seatAvailable: 3, seatTotal: 0 }),    // 좌석 데이터 없음 — 제외
      ],
      TODAY,
      TOMORROW,
    )
    expect(films.map((f) => f.movie.id).sort()).toEqual(['m1', 'm2', 'm3'])
  })

  it(`영화 ${MIN_ALMOST_SOLD_OUT_FILMS}편 미만이면 빈 배열을 반환한다 (섹션 숨김)`, () => {
    expect(getAlmostSoldOutFilms(lowCandidates(MIN_ALMOST_SOLD_OUT_FILMS - 1), TODAY, TOMORROW)).toEqual([])
    expect(getAlmostSoldOutFilms(lowCandidates(MIN_ALMOST_SOLD_OUT_FILMS), TODAY, TOMORROW)).toHaveLength(
      MIN_ALMOST_SOLD_OUT_FILMS,
    )
  })

  it('오늘~내일 범위 밖 회차는 무시한다', () => {
    const films = getAlmostSoldOutFilms(
      [
        ...lowCandidates(2),
        candidate({ movieId: 'm3', showDate: '2026-07-04' }), // 어제
        candidate({ movieId: 'm4', showDate: '2026-07-07' }), // 모레
      ],
      TODAY,
      TOMORROW,
    )
    expect(films).toEqual([])
  })

  it('nowTime 지정 시 오늘 이미 시작한 회차는 제외하되 내일 회차는 유지한다', () => {
    const films = getAlmostSoldOutFilms(
      [
        ...lowCandidates(2),
        candidate({ movieId: 'm3', showDate: TODAY, showTime: '13:00:00' }),
        candidate({ movieId: 'm3', showDate: TOMORROW, showTime: '11:00:00' }),
      ],
      TODAY,
      TOMORROW,
      '14:00',
    )
    const m3 = films.find((f) => f.movie.id === 'm3')
    expect(m3?.showings).toHaveLength(1)
    expect(m3?.showings[0].showDate).toBe(TOMORROW)
  })

  it('같은 영화의 회차를 그룹해 날짜+시간 오름차순으로 정렬한다', () => {
    const films = getAlmostSoldOutFilms(
      [
        ...lowCandidates(2),
        candidate({ movieId: 'm3', showDate: TOMORROW, showTime: '11:00:00', theaterName: '더숲' }),
        candidate({ movieId: 'm3', showDate: TODAY, showTime: '20:00:00' }),
      ],
      TODAY,
      TOMORROW,
    )
    const m3 = films.find((f) => f.movie.id === 'm3')
    expect(m3?.showings.map((s) => `${s.showDate} ${s.showTime}`)).toEqual([
      `${TODAY} 20:00`,
      `${TOMORROW} 11:00`,
    ])
  })

  it('가장 임박한 회차를 가진 영화가 먼저 온다', () => {
    const films = getAlmostSoldOutFilms(
      [
        candidate({ movieId: 'm1', showDate: TOMORROW, showTime: '11:00:00' }),
        candidate({ movieId: 'm2', showDate: TODAY, showTime: '21:00:00' }),
        candidate({ movieId: 'm3', showDate: TODAY, showTime: '18:00:00' }),
      ],
      TODAY,
      TOMORROW,
    )
    expect(films.map((f) => f.movie.id)).toEqual(['m3', 'm2', 'm1'])
  })

  it('showTime을 "HH:MM"으로 정규화한다', () => {
    const films = getAlmostSoldOutFilms(lowCandidates(3), TODAY, TOMORROW)
    expect(films[0].showings[0].showTime).toBe('19:30')
  })
})

describe('formatAlmostSoldOutCaption', () => {
  it('가장 임박한 회차의 날짜·시간·극장만 노출하고 좌석 수는 넣지 않는다', () => {
    const [film] = getAlmostSoldOutFilms(lowCandidates(3), TODAY, TOMORROW)
    const caption = formatAlmostSoldOutCaption(film, TODAY)
    expect(caption).toBe('오늘 19:30 에무시네마')
    expect(caption).not.toMatch(/\d+석/)
  })

  it('내일 회차는 "내일"로, 추가 회차는 "외 N회"로 표기한다', () => {
    const films = getAlmostSoldOutFilms(
      [
        ...lowCandidates(2),
        candidate({ movieId: 'm3', showDate: TOMORROW, showTime: '11:00:00', theaterName: '더숲' }),
        candidate({ movieId: 'm3', showDate: TOMORROW, showTime: '14:00:00', theaterName: '더숲' }),
        candidate({ movieId: 'm3', showDate: TOMORROW, showTime: '17:00:00', theaterName: '더숲' }),
      ],
      TODAY,
      TOMORROW,
    )
    const m3 = films.find((f) => f.movie.id === 'm3')!
    expect(formatAlmostSoldOutCaption(m3, TODAY)).toBe('내일 11:00 더숲 · 외 2회')
  })
})
