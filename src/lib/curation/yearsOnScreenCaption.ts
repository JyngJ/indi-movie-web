import type { Movie } from '@/types/api'

// ─────────────────────────────────────────────
// "N년 만에 스크린으로" 카피 — 오랜만에 상영(returning) 섹션 업그레이드
//
// 왜 "N년 만에 재개봉" 단정형을 쓰지 않는가:
// movies.year 는 KMDb prodYear(제작연도)이고(src/lib/admin/kmdb.ts parseYear),
// 원본 값이 없으면 개봉연도·크롤 시점 연도로 폴백되기도 한다.
// 제작연도 ≠ 직전 상영 시점이므로 "N년 만에 재개봉"은 틀린 숫자가 될 수 있다.
// 대신 제작연도를 명시하는 형태("1998년작, 다시 스크린으로")만 사용한다.
// ─────────────────────────────────────────────

/** 이 연식(년) 미만의 작품엔 카피를 붙이지 않는다 — 숫자가 작으면 후킹이 아니라 소음 */
export const YEARS_ON_SCREEN_MIN_AGE = 15

/**
 * 제작연도 기반 포스터 카피. 노출 조건을 못 채우면 null.
 * - year 가 정수가 아니거나 0 이하(결측/이상치) → null
 * - year 가 currentYear 보다 미래(데이터 오류) → null
 * - 연식(currentYear - year)이 YEARS_ON_SCREEN_MIN_AGE 미만 → null
 */
export function getYearsOnScreenCaption(
  year: number | null | undefined,
  currentYear: number,
): string | null {
  if (year == null || !Number.isInteger(year) || year <= 0) return null
  if (year > currentYear) return null
  if (currentYear - year < YEARS_ON_SCREEN_MIN_AGE) return null
  return `${year}년작, 다시 스크린으로`
}

/** 영화 목록 → movieId 별 카피 Map. 카피가 없는 영화는 키 자체를 넣지 않는다. */
export function buildYearsOnScreenCaptions(
  movies: Pick<Movie, 'id' | 'year'>[],
  currentYear: number,
): Map<string, string> {
  const captions = new Map<string, string>()
  for (const movie of movies) {
    const caption = getYearsOnScreenCaption(movie.year, currentYear)
    if (caption) captions.set(movie.id, caption)
  }
  return captions
}
