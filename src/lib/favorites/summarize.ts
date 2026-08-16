import type { Favorite } from './types'

/** 관심 목록 화면용 조인 로직 — 순수 함수. 데이터 소스(카탈로그·활성 상영 쌍)는 훅이 넘긴다. */

export interface FavoriteMovieRow {
  id: string
  title: string
  posterUrl?: string
  year?: number
  /** 오늘 이후 상영 중인 극장 수 */
  screeningTheaterCount: number
  createdAt: string
}

export interface FavoriteTheaterRow {
  id: string
  name: string
  city: string
  /** 오늘 이후 상영 중인 영화 수 */
  screeningMovieCount: number
  createdAt: string
}

export function summarizeFavorites(
  favorites: readonly Favorite[],
  movies: readonly { id: string; title: string; posterUrl?: string; year?: number }[],
  theaters: readonly { id: string; name: string; city: string }[],
  activePairs: readonly { movieId: string; theaterId: string }[],
): { movies: FavoriteMovieRow[]; theaters: FavoriteTheaterRow[] } {
  const theatersByMovie = new Map<string, Set<string>>()
  const moviesByTheater = new Map<string, Set<string>>()
  for (const p of activePairs) {
    if (!theatersByMovie.has(p.movieId)) theatersByMovie.set(p.movieId, new Set())
    theatersByMovie.get(p.movieId)!.add(p.theaterId)
    if (!moviesByTheater.has(p.theaterId)) moviesByTheater.set(p.theaterId, new Set())
    moviesByTheater.get(p.theaterId)!.add(p.movieId)
  }
  const movieById = new Map(movies.map((m) => [m.id, m]))
  const theaterById = new Map(theaters.map((t) => [t.id, t]))

  const outMovies: FavoriteMovieRow[] = []
  const outTheaters: FavoriteTheaterRow[] = []
  for (const f of favorites) {
    if (f.type === 'movie') {
      const m = movieById.get(f.id)
      if (!m) continue // 카탈로그에서 사라진 영화 — 목록에서 자연 탈락
      outMovies.push({ id: m.id, title: m.title, posterUrl: m.posterUrl, year: m.year, screeningTheaterCount: theatersByMovie.get(m.id)?.size ?? 0, createdAt: f.createdAt })
    } else {
      const t = theaterById.get(f.id)
      if (!t) continue
      outTheaters.push({ id: t.id, name: t.name, city: t.city, screeningMovieCount: moviesByTheater.get(t.id)?.size ?? 0, createdAt: f.createdAt })
    }
  }
  // 상영 중인 것 먼저, 그 다음 최근 등록순
  outMovies.sort((a, b) => (b.screeningTheaterCount > 0 ? 1 : 0) - (a.screeningTheaterCount > 0 ? 1 : 0) || b.createdAt.localeCompare(a.createdAt))
  outTheaters.sort((a, b) => (b.screeningMovieCount > 0 ? 1 : 0) - (a.screeningMovieCount > 0 ? 1 : 0) || b.createdAt.localeCompare(a.createdAt))
  return { movies: outMovies, theaters: outTheaters }
}
