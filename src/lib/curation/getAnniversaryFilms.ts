import type { Movie } from '@/types/api'

// ─────────────────────────────────────────────
// 개봉 N주년 재상영 (anniversary)
// 활성 상영작 중 개봉 후 딱 10의 배수 해를 맞은 영화를 모은다.
// "올해로 30년" — 재개봉 많은 카탈로그 특성상 자동으로 채워지는 섹션.
// ─────────────────────────────────────────────

/** 이 편수 미만이면 섹션 자체를 숨긴다 */
export const MIN_ANNIVERSARY_FILMS = 3

/** 주년으로 인정하는 최소 나이 — 10주년부터 */
const MIN_AGE = 10

export interface AnniversaryFilm {
  movie: Movie
  /** 개봉 후 경과 연수 (10, 20, 30 …) */
  age: number
}

/**
 * 개봉 N주년(10의 배수)을 맞은 활성 상영작을 반환.
 * 오래된 순(주년 큰 순) 정렬 — "올해로 60년"이 앞에 오도록.
 * MIN_ANNIVERSARY_FILMS 미만이면 빈 배열(섹션 숨김).
 */
export function getAnniversaryFilms(
  movies: Movie[],
  activeMovieIds: ReadonlySet<string>,
  currentYear: number,
): AnniversaryFilm[] {
  const films: AnniversaryFilm[] = []
  for (const movie of movies) {
    if (!activeMovieIds.has(movie.id)) continue
    if (!movie.year) continue
    const age = currentYear - movie.year
    if (age < MIN_AGE || age % 10 !== 0) continue
    films.push({ movie, age })
  }
  films.sort((a, b) => b.age - a.age)
  return films.length >= MIN_ANNIVERSARY_FILMS ? films : []
}
