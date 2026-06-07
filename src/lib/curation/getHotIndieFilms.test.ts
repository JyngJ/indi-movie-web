import { describe, expect, it } from 'vitest'
import { getHotIndieFilms, HOT_INDIE_MIN_THEATER_COUNT } from './getHotIndieFilms'
import { fixtureMovie, inMemoryHotIndieFilmsRepository } from './fixtures'

function statuses(soldOutCount: number, totalCount: number) {
  return Array.from({ length: totalCount }, (_, i) => ({
    theaterId: `t${i}`,
    soldOut: i < soldOutCount,
  }))
}

describe('getHotIndieFilms', () => {
  it('ranks by sold-out theater ratio, descending', async () => {
    const a = fixtureMovie({ id: 'a', title: 'A' }) // 4/6 ≈ 0.67
    const b = fixtureMovie({ id: 'b', title: 'B' }) // 5/5 = 1.0
    const c = fixtureMovie({ id: 'c', title: 'C' }) // 1/5 = 0.2
    const repo = inMemoryHotIndieFilmsRepository([
      { movie: a, theaterStatuses: statuses(4, 6) },
      { movie: b, theaterStatuses: statuses(5, 5) },
      { movie: c, theaterStatuses: statuses(1, 5) },
    ])

    const result = await getHotIndieFilms(repo)

    expect(result.map(f => f.movie.id)).toEqual(['b', 'a', 'c'])
    expect(result[0].soldOutRatio).toBeCloseTo(1)
    expect(result[1].soldOutRatio).toBeCloseTo(4 / 6)
  })

  it('breaks ratio ties by theater count, descending', async () => {
    const fewer = fixtureMovie({ id: 'fewer', title: '적은관' }) // 3/6 = 0.5
    const more = fixtureMovie({ id: 'more', title: '많은관' }) // 5/10 = 0.5
    const repo = inMemoryHotIndieFilmsRepository([
      { movie: fewer, theaterStatuses: statuses(3, 6) },
      { movie: more, theaterStatuses: statuses(5, 10) },
    ])

    const result = await getHotIndieFilms(repo)
    expect(result.map(f => f.movie.id)).toEqual(['more', 'fewer'])
  })

  it('excludes films screening in fewer than the minimum theater count', async () => {
    const tooFew = fixtureMovie({ id: 'tooFew', title: '소수관' })
    const enough = fixtureMovie({ id: 'enough', title: '충분관' })
    const repo = inMemoryHotIndieFilmsRepository([
      { movie: tooFew, theaterStatuses: statuses(2, HOT_INDIE_MIN_THEATER_COUNT - 1) },
      { movie: enough, theaterStatuses: statuses(2, HOT_INDIE_MIN_THEATER_COUNT) },
    ])

    expect((await getHotIndieFilms(repo)).map(f => f.movie.id)).toEqual(['enough'])
  })

  it('respects a custom limit', async () => {
    const repo = inMemoryHotIndieFilmsRepository(
      ['x', 'y', 'z'].map(id => ({
        movie: fixtureMovie({ id, title: id }),
        theaterStatuses: statuses(3, 5),
      })),
    )

    expect(await getHotIndieFilms(repo, { limit: 2 })).toHaveLength(2)
  })
})
