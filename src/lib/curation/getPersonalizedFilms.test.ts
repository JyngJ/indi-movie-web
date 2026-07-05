import { describe, expect, it } from 'vitest'
import { getPersonalizedFilms } from './getPersonalizedFilms'
import { fixtureMovie } from './fixtures'
import type { Movie } from '@/types/api'

function idsOf(movies: Movie[]): string[] {
  return movies.map((m) => m.id)
}

describe('getPersonalizedFilms', () => {
  it('returns a director group when 3+ active films share a director with a recently viewed film', () => {
    const seen = fixtureMovie({ id: 'seen', title: '기생충', director: ['봉준호'] })
    const pool = [
      fixtureMovie({ id: 'a', title: '살인의 추억', director: ['봉준호'], year: 2003 }),
      fixtureMovie({ id: 'b', title: '마더', director: ['봉준호'], year: 2009 }),
      fixtureMovie({ id: 'c', title: '옥자', director: ['봉준호'], year: 2017 }),
      fixtureMovie({ id: 'x', title: '무관한 영화', director: ['다른감독'], year: 2020 }),
    ]
    const all = [seen, ...pool]

    const result = getPersonalizedFilms(['seen'], all, new Set(['seen', 'a', 'b', 'c', 'x']))

    expect(result).toHaveLength(1)
    expect(result[0].reason).toMatchObject({ type: 'director', director: '봉준호' })
    expect(result[0].reason.sourceMovie.id).toBe('seen')
    expect(idsOf(result[0].movies).sort()).toEqual(['a', 'b', 'c'])
  })

  it('never includes the recently viewed films themselves', () => {
    const seen = fixtureMovie({ id: 'seen', title: '기생충', director: ['봉준호'] })
    const pool = [
      fixtureMovie({ id: 'a', title: 'A', director: ['봉준호'] }),
      fixtureMovie({ id: 'b', title: 'B', director: ['봉준호'] }),
      fixtureMovie({ id: 'c', title: 'C', director: ['봉준호'] }),
    ]
    // 최근 본 영화도 현재 상영 중인 케이스
    const result = getPersonalizedFilms(['seen'], [seen, ...pool], new Set(['seen', 'a', 'b', 'c']))

    expect(result).toHaveLength(1)
    expect(idsOf(result[0].movies)).not.toContain('seen')
  })

  it('drops a director group under the minimum and falls back to nation-era', () => {
    const seen = fixtureMovie({ id: 'seen', title: '화양연화', director: ['왕가위'], nation: '홍콩', year: 2000 })
    const all = [
      seen,
      // 감독 일치는 2편뿐 — 최소 3편 미달로 버려짐
      fixtureMovie({ id: 'd1', title: '중경삼림', director: ['왕가위'], nation: '홍콩', year: 1994 }),
      fixtureMovie({ id: 'd2', title: '해피투게더', director: ['왕가위'], nation: '홍콩', year: 1997 }),
      // 같은 국가 + ±10년
      fixtureMovie({ id: 'n1', title: '첨밀밀', nation: '홍콩', year: 1996 }),
      // 국가는 같지만 연도가 범위 밖
      fixtureMovie({ id: 'far', title: '옛날 영화', nation: '홍콩', year: 1970 }),
    ]

    const result = getPersonalizedFilms(['seen'], all, new Set(['d1', 'd2', 'n1', 'far']))

    expect(result).toHaveLength(1)
    expect(result[0].reason).toMatchObject({ type: 'nation-era', nation: '홍콩' })
    // 감독 일치작도 국가+시기 조건을 만족하므로 nation-era 그룹에 포함될 수 있음
    expect(idsOf(result[0].movies).sort()).toEqual(['d1', 'd2', 'n1'])
    expect(idsOf(result[0].movies)).not.toContain('far')
  })

  it('falls back to genre when director and nation-era both fail', () => {
    const seen = fixtureMovie({ id: 'seen', title: '서치', genre: ['스릴러'], nation: '미국', year: 2018, director: ['아니쉬 차간티'] })
    const all = [
      seen,
      fixtureMovie({ id: 'g1', title: 'T1', genre: ['스릴러'], nation: '한국', year: 1990 }),
      fixtureMovie({ id: 'g2', title: 'T2', genre: ['스릴러', '드라마'], nation: '프랑스', year: 2000 }),
      fixtureMovie({ id: 'g3', title: 'T3', genre: ['스릴러'], nation: '일본', year: 1985 }),
      fixtureMovie({ id: 'o1', title: 'O1', genre: ['코미디'], nation: '한국', year: 2020 }),
    ]

    const result = getPersonalizedFilms(['seen'], all, new Set(['g1', 'g2', 'g3', 'o1']))

    expect(result).toHaveLength(1)
    expect(result[0].reason).toMatchObject({ type: 'genre', genre: '스릴러' })
    expect(idsOf(result[0].movies).sort()).toEqual(['g1', 'g2', 'g3'])
  })

  it('returns an empty array when no fallback stage can fill a group', () => {
    const seen = fixtureMovie({ id: 'seen', title: '고아 영화', director: ['무명'], genre: ['실험'], nation: '아이슬란드', year: 2024 })
    const all = [
      seen,
      fixtureMovie({ id: 'u1', title: 'U1', director: ['다른이'], genre: ['드라마'], nation: '한국', year: 2020 }),
      fixtureMovie({ id: 'u2', title: 'U2', director: ['또다른이'], genre: ['코미디'], nation: '일본', year: 2021 }),
    ]

    expect(getPersonalizedFilms(['seen'], all, new Set(['u1', 'u2']))).toEqual([])
  })

  it('returns an empty array for a new user with no history', () => {
    const all = [fixtureMovie({ id: 'a', title: 'A', director: ['감독'] })]
    expect(getPersonalizedFilms([], all, new Set(['a']))).toEqual([])
  })

  it('ignores recently viewed ids that are not in the movie list', () => {
    const all = [fixtureMovie({ id: 'a', title: 'A', director: ['감독'] })]
    expect(getPersonalizedFilms(['ghost'], all, new Set(['a']))).toEqual([])
  })

  it('only recommends currently screening films', () => {
    const seen = fixtureMovie({ id: 'seen', title: 'S', director: ['감독'] })
    const all = [
      seen,
      fixtureMovie({ id: 'a', title: 'A', director: ['감독'] }),
      fixtureMovie({ id: 'b', title: 'B', director: ['감독'] }),
      fixtureMovie({ id: 'c', title: 'C', director: ['감독'] }),
    ]
    // c는 상영 종료
    expect(getPersonalizedFilms(['seen'], all, new Set(['a', 'b']))).toEqual([])
  })

  it('does not repeat a movie across groups when maxGroups > 1', () => {
    const seen1 = fixtureMovie({ id: 's1', title: 'S1', director: ['감독A'], nation: '한국', year: 2020 })
    const seen2 = fixtureMovie({ id: 's2', title: 'S2', director: ['감독B'], nation: '한국', year: 2020 })
    const all = [
      seen1,
      seen2,
      fixtureMovie({ id: 'a1', title: 'A1', director: ['감독A'], nation: '한국', year: 2019 }),
      fixtureMovie({ id: 'a2', title: 'A2', director: ['감독A'], nation: '한국', year: 2021 }),
      fixtureMovie({ id: 'a3', title: 'A3', director: ['감독A'], nation: '한국', year: 2022 }),
      fixtureMovie({ id: 'b1', title: 'B1', director: ['감독B'], nation: '한국', year: 2018 }),
      fixtureMovie({ id: 'b2', title: 'B2', director: ['감독B'], nation: '한국', year: 2023 }),
      fixtureMovie({ id: 'b3', title: 'B3', director: ['감독B'], nation: '한국', year: 2024 }),
    ]
    const active = new Set(['a1', 'a2', 'a3', 'b1', 'b2', 'b3'])

    const result = getPersonalizedFilms(['s1', 's2'], all, active, { maxGroups: 2 })

    expect(result).toHaveLength(2)
    const allIds = result.flatMap((g) => idsOf(g.movies))
    expect(new Set(allIds).size).toBe(allIds.length)
  })

  it('respects maxMoviesPerGroup', () => {
    const seen = fixtureMovie({ id: 'seen', title: 'S', director: ['감독'] })
    const all = [
      seen,
      ...Array.from({ length: 6 }, (_, i) =>
        fixtureMovie({ id: `m${i}`, title: `M${i}`, director: ['감독'], year: 2000 + i }),
      ),
    ]
    const active = new Set(all.map((m) => m.id))

    const result = getPersonalizedFilms(['seen'], all, active, { maxMoviesPerGroup: 4 })

    expect(result).toHaveLength(1)
    expect(result[0].movies).toHaveLength(4)
  })

  it('is deterministic regardless of input movie order', () => {
    const seen = fixtureMovie({ id: 'seen', title: 'S', director: ['감독'] })
    const pool = [
      fixtureMovie({ id: 'a', title: '가', director: ['감독'], year: 2001 }),
      fixtureMovie({ id: 'b', title: '나', director: ['감독'], year: 2003 }),
      fixtureMovie({ id: 'c', title: '다', director: ['감독'], year: 2002 }),
    ]
    const active = new Set(['a', 'b', 'c'])

    const forward = getPersonalizedFilms(['seen'], [seen, ...pool], active)
    const reversed = getPersonalizedFilms(['seen'], [...pool].reverse().concat(seen), active)

    expect(idsOf(forward[0].movies)).toEqual(idsOf(reversed[0].movies))
    // 연도 내림차순 → 제목 → id
    expect(idsOf(forward[0].movies)).toEqual(['b', 'c', 'a'])
  })

  it('uses the most recently viewed film first as the reason source', () => {
    const recent = fixtureMovie({ id: 'recent', title: 'R', director: ['감독A'] })
    const older = fixtureMovie({ id: 'older', title: 'O', director: ['감독B'] })
    const all = [
      recent,
      older,
      fixtureMovie({ id: 'a1', title: 'A1', director: ['감독A'] }),
      fixtureMovie({ id: 'a2', title: 'A2', director: ['감독A'] }),
      fixtureMovie({ id: 'a3', title: 'A3', director: ['감독A'] }),
      fixtureMovie({ id: 'b1', title: 'B1', director: ['감독B'] }),
      fixtureMovie({ id: 'b2', title: 'B2', director: ['감독B'] }),
      fixtureMovie({ id: 'b3', title: 'B3', director: ['감독B'] }),
    ]
    const active = new Set(['a1', 'a2', 'a3', 'b1', 'b2', 'b3'])

    const result = getPersonalizedFilms(['recent', 'older'], all, active)

    expect(result).toHaveLength(1)
    expect(result[0].reason.sourceMovie.id).toBe('recent')
    expect(result[0].reason.director).toBe('감독A')
  })
})
