import { describe, expect, it } from 'vitest'
import { robotsForMovie, shouldIndexMovie } from './indexPolicy'

describe('shouldIndexMovie', () => {
  const rich = { hasUpcoming: false, synopsisLength: 200, sameDirectorNowShowing: 1, pastScreeningDays: 0 }
  const empty = { hasUpcoming: false, synopsisLength: 0, sameDirectorNowShowing: 0, pastScreeningDays: 0 }

  it('상영이 있으면 언제나 색인', () => {
    expect(shouldIndexMovie({ ...empty, hasUpcoming: true })).toBe(true)
  })

  it('상영이 없어도 시놉시스가 있고 같은 감독 영화가 상영 중이면 색인', () => {
    expect(shouldIndexMovie(rich)).toBe(true)
  })

  it('시놉시스가 짧거나 같은 감독 상영작이 없으면 색인 제외', () => {
    expect(shouldIndexMovie({ ...rich, synopsisLength: 40 })).toBe(false)
    expect(shouldIndexMovie({ ...rich, sameDirectorNowShowing: 0 })).toBe(false)
  })

  it('지난 상영이 3일 이상이면 다른 조건 없이 색인, 2일 이하는 제외', () => {
    expect(shouldIndexMovie({ ...empty, pastScreeningDays: 3 })).toBe(true)
    expect(shouldIndexMovie({ ...empty, pastScreeningDays: 2 })).toBe(false)
  })

  it('robots — 색인 대상이면 기본값, 아니면 noindex·follow', () => {
    expect(robotsForMovie(rich)).toBeUndefined()
    expect(robotsForMovie({ ...rich, sameDirectorNowShowing: 0 })).toEqual({ index: false, follow: true })
  })
})
