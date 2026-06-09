import type { NewIndieFilm, NewIndieFilmsRepository } from './types'

export async function getNewIndieFilms(
  repo: NewIndieFilmsRepository,
  weekStart: string,
  weekEnd: string,
  limit = 8,
): Promise<NewIndieFilm[]> {
  const candidates = await repo.getCandidates(weekStart, weekEnd)
  return candidates
    .sort((a, b) => a.firstShowDate.localeCompare(b.firstShowDate))
    .slice(0, limit)
    .map(c => ({ movie: c.movie, firstShowDate: c.firstShowDate }))
}
