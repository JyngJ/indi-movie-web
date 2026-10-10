import { describe, expect, it } from 'vitest'
import { buildMovieScreeningSummary, type SummaryEntry } from './movieScreeningSummary'

const st = (n: number) => Array.from({ length: n }, () => ({}))

describe('buildMovieScreeningSummary', () => {
  it('상영이 없으면 null', () => {
    expect(buildMovieScreeningSummary([], '2026-10-10')).toBeNull()
    expect(buildMovieScreeningSummary([
      { theaterName: 'A', theaterAddress: '서울 중구', dateGroups: [{ date: '2026-10-11', showtimes: [] }] },
    ], '2026-10-10')).toBeNull()
  })

  it('극장 수·회차 수·지역·첫 상영·마지막 상영을 한 줄로 낸다', () => {
    const entries: SummaryEntry[] = [
      { theaterName: '서울영화센터', theaterAddress: '서울 중구 마른내로 38', dateGroups: [
        { date: '2026-10-11', showtimes: st(2) }, { date: '2026-10-17', showtimes: st(1) },
      ] },
      { theaterName: '에무시네마', theaterAddress: '서울 종로구', dateGroups: [{ date: '2026-10-12', showtimes: st(3) }] },
      { theaterName: '영화의전당', theaterAddress: '부산 해운대구', dateGroups: [{ date: '2026-10-13', showtimes: st(1) }] },
    ]
    expect(buildMovieScreeningSummary(entries, '2026-10-10')).toBe(
      '앞으로 2주 동안 3곳에서 7회 상영해요 (서울 2곳 · 부산 1곳) · 첫 상영 10월 11일 (일) 서울영화센터 · 마지막 상영 10월 17일 (토)',
    )
  })

  it('첫 상영이 오늘이면 "오늘", 하루뿐이면 마지막 상영을 빼고, 지난 날짜는 세지 않는다', () => {
    const entries: SummaryEntry[] = [
      { theaterName: '인디스페이스', theaterAddress: '서울 마포구', dateGroups: [
        { date: '2026-10-09', showtimes: st(4) }, { date: '2026-10-10', showtimes: st(2) },
      ] },
    ]
    expect(buildMovieScreeningSummary(entries, '2026-10-10')).toBe(
      '앞으로 2주 동안 1곳에서 2회 상영해요 (서울 1곳) · 첫 상영 오늘 인디스페이스',
    )
  })
})
