import type { Movie } from '@/types/api'

/**
 * Supabase `movies` row → Movie 변환 모음.
 *
 * 두 변환은 규칙이 미묘하게 다르므로 합치지 않는다:
 * - `movieRowToMovie` (queries.ts 훅 계열): falsy 값("", 0)을 undefined로 걸러내고,
 *   `year`는 폴백 없이 `Number(row.year)` 그대로.
 * - `rowToMovie` (큐레이션 계열): null/undefined만 걸러내며(""·0 유지),
 *   `year`는 null이면 2000으로 폴백.
 */

/** queries.ts 훅 계열 변환 — falsy("", 0) 값은 undefined 처리, year 폴백 없음. */
export function movieRowToMovie(row: Record<string, unknown>): Movie {
  return {
    id: String(row.id),
    title: String(row.title),
    originalTitle: row.original_title ? String(row.original_title) : undefined,
    year: Number(row.year),
    posterUrl: row.poster_url ? String(row.poster_url) : undefined,
    genre: (row.genre as string[] | null) ?? [],
    director: (row.director as string[] | null) ?? [],
    nation: row.nation ? String(row.nation) : undefined,
    kmdbId: row.kmdb_id ? String(row.kmdb_id) : undefined,
    tmdbId: row.tmdb_id ? Number(row.tmdb_id) : undefined,
    rating: row.rating ? Number(row.rating) : undefined,
  }
}

/** 큐레이션 계열 변환 — null/undefined만 걸러냄(""·0 유지), year는 2000 폴백. */
export function rowToMovie(movieRaw: Record<string, unknown>): Movie {
  return {
    id: String(movieRaw.id),
    title: String(movieRaw.title),
    originalTitle: movieRaw.original_title != null ? String(movieRaw.original_title) : undefined,
    year: Number(movieRaw.year ?? 2000),
    posterUrl: movieRaw.poster_url != null ? String(movieRaw.poster_url) : undefined,
    genre: (movieRaw.genre as string[]) ?? [],
    director: (movieRaw.director as string[]) ?? [],
    nation: movieRaw.nation != null ? String(movieRaw.nation) : undefined,
    kmdbId: movieRaw.kmdb_id != null ? String(movieRaw.kmdb_id) : undefined,
    tmdbId: movieRaw.tmdb_id != null ? Number(movieRaw.tmdb_id) : undefined,
    rating: movieRaw.rating != null ? Number(movieRaw.rating) : undefined,
  }
}
