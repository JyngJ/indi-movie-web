import type { HotIndieFilm, HotIndieFilmCandidate, HotIndieFilmsRepository } from './types'

/** 랭킹에 들려면 최소 이만큼의 영화관에서 상영 중이어야 함 */
export const HOT_INDIE_MIN_THEATER_COUNT = 5

export interface GetHotIndieFilmsOptions {
  minTheaterCount?: number
  limit?: number
}

function buildHotIndieFilm(candidate: HotIndieFilmCandidate): HotIndieFilm {
  const theaterCount = candidate.theaterStatuses.length
  const soldOutTheaterCount = candidate.theaterStatuses.filter(status => status.soldOut).length

  return {
    movie: candidate.movie,
    theaterCount,
    soldOutTheaterCount,
    soldOutRatio: theaterCount === 0 ? 0 : soldOutTheaterCount / theaterCount,
  }
}

/** 매진 영화관 비율(soldOutRatio) 내림차순, 동률이면 상영관 수 내림차순 */
export async function getHotIndieFilms(
  repo: HotIndieFilmsRepository,
  options: GetHotIndieFilmsOptions = {},
): Promise<HotIndieFilm[]> {
  const minTheaterCount = options.minTheaterCount ?? HOT_INDIE_MIN_THEATER_COUNT
  const candidates = await repo.getCandidates()

  const ranked = candidates
    .map(buildHotIndieFilm)
    .filter(film => film.theaterCount >= minTheaterCount)
    .sort((a, b) => b.soldOutRatio - a.soldOutRatio || b.theaterCount - a.theaterCount)

  return options.limit !== undefined ? ranked.slice(0, options.limit) : ranked
}
