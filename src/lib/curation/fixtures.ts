import type { Movie } from '@/types/api'
import type {
  HotIndieFilmCandidate,
  HotIndieFilmsRepository,
  ReturningFilmCandidate,
  ReturningFilmsRepository,
  ScreeningRun,
} from './types'

/** 테스트/더미용 최소 Movie — 필수 필드만 채우고 나머지는 override 가능 */
export function fixtureMovie(overrides: Partial<Movie> & Pick<Movie, 'id' | 'title'>): Movie {
  return {
    year: 2000,
    genre: [],
    director: [],
    ...overrides,
  }
}

export function run(startDate: string, endDate: string): ScreeningRun {
  return { startDate, endDate }
}

export function inMemoryReturningFilmsRepository(
  candidates: ReturningFilmCandidate[],
): ReturningFilmsRepository {
  return {
    async getCandidates() {
      return candidates
    },
  }
}

export function inMemoryHotIndieFilmsRepository(
  candidates: HotIndieFilmCandidate[],
): HotIndieFilmsRepository {
  return {
    async getCandidates() {
      return candidates
    },
  }
}
