import { describe, expect, it } from 'vitest'
import { getReturningFilms, RETURNING_FILM_MIN_GAP_MONTHS } from './getReturningFilms'
import { fixtureMovie, inMemoryReturningFilmsRepository, run } from './fixtures'

describe('getReturningFilms', () => {
  it('includes films with a 12+ month gap between the previous run and the current run', async () => {
    const movie = fixtureMovie({ id: 'm1', title: '화양연화' })
    const repo = inMemoryReturningFilmsRepository([
      { movie, runs: [run('2000-09-01', '2000-12-01'), run('2026-06-01', '2026-07-01')] },
    ])

    const result = await getReturningFilms(repo, '2026-06-15')

    expect(result).toHaveLength(1)
    expect(result[0].movie.id).toBe('m1')
    expect(result[0].lastScreenedEndDate).toBe('2000-12-01')
    expect(result[0].currentRunStartDate).toBe('2026-06-01')
    expect(result[0].gapMonths).toBeGreaterThanOrEqual(RETURNING_FILM_MIN_GAP_MONTHS)
  })

  it('excludes films whose gap is shorter than the threshold', async () => {
    const movie = fixtureMovie({ id: 'm2', title: '연속상영작' })
    const repo = inMemoryReturningFilmsRepository([
      { movie, runs: [run('2025-08-01', '2025-12-01'), run('2026-06-01', '2026-07-01')] },
    ])

    expect(await getReturningFilms(repo, '2026-06-15')).toHaveLength(0)
  })

  it('excludes films with only one run — never came down before, so not "returning"', async () => {
    const movie = fixtureMovie({ id: 'm3', title: '신작' })
    const repo = inMemoryReturningFilmsRepository([
      { movie, runs: [run('2026-06-01', '2026-07-01')] },
    ])

    expect(await getReturningFilms(repo, '2026-06-15')).toHaveLength(0)
  })

  it('formats the tag in months under 2 years and in whole years at 2+ years', async () => {
    const shortGap = fixtureMovie({ id: 'm4', title: '14개월작' })
    const longGap = fixtureMovie({ id: 'm5', title: '5년작' })
    const repo = inMemoryReturningFilmsRepository([
      { movie: shortGap, runs: [run('2025-04-15', '2025-04-15'), run('2026-06-15', '2026-07-01')] },
      { movie: longGap, runs: [run('2021-06-15', '2021-06-15'), run('2026-06-15', '2026-07-01')] },
    ])

    const result = await getReturningFilms(repo, '2026-06-15')
    expect(result.find(f => f.movie.id === 'm4')?.tagText).toBe('14개월 만의 재상영')
    expect(result.find(f => f.movie.id === 'm5')?.tagText).toBe('5년 만의 재상영')
  })

  it('sorts by gap length, longest first', async () => {
    const shortGap = fixtureMovie({ id: 'm6', title: 'A' })
    const longGap = fixtureMovie({ id: 'm7', title: 'B' })
    const repo = inMemoryReturningFilmsRepository([
      { movie: shortGap, runs: [run('2025-01-01', '2025-01-15'), run('2026-06-01', '2026-07-01')] },
      { movie: longGap, runs: [run('2018-01-01', '2018-01-15'), run('2026-06-01', '2026-07-01')] },
    ])

    const result = await getReturningFilms(repo, '2026-06-15')
    expect(result.map(f => f.movie.id)).toEqual(['m7', 'm6'])
  })
})
