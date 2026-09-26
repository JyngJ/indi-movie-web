import { describe, expect, it } from 'vitest'
import { refreshLastWeekFilms } from './lastWeekDaysLeft'
import type { LastWeekFilm } from './types'

const film = (id: string, maxShowDate: string, daysLeft: number, regions: string[] = ['서울']): LastWeekFilm => ({
  movie: { id } as LastWeekFilm['movie'],
  maxShowDate,
  daysLeft,
  badgeText: '',
  regions,
})

describe('refreshLastWeekFilms', () => {
  it('recounts daysLeft from today instead of the snapshot date', () => {
    // 9/26 스냅샷에서 D-1이던 영화 — 9/27이 되면 오늘이 마지막
    const [f] = refreshLastWeekFilms([film('a', '2026-09-27', 1)], '2026-09-27')
    expect(f.daysLeft).toBe(0)
  })

  it('drops films whose last day has passed', () => {
    expect(refreshLastWeekFilms([film('a', '2026-09-26', 0)], '2026-09-27')).toEqual([])
  })

  it('counts across month boundaries', () => {
    const [f] = refreshLastWeekFilms([film('a', '2026-10-01', 5)], '2026-09-27')
    expect(f.daysLeft).toBe(4)
  })

  it('keeps the same object when daysLeft is already correct', () => {
    const input = film('a', '2026-09-29', 2)
    expect(refreshLastWeekFilms([input], '2026-09-27')[0]).toBe(input)
  })

  it('filters by region when given', () => {
    const films = [film('a', '2026-09-29', 2, ['서울']), film('b', '2026-09-29', 2, ['부산'])]
    expect(refreshLastWeekFilms(films, '2026-09-27', '부산').map((f) => f.movie.id)).toEqual(['b'])
  })
})
