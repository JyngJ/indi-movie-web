// ================================
// 동명 영화 매칭 보류 — DB에 없는 KMDb 후보 고르기 (순수 함수)
// ================================

import type { AdminExternalMovie } from '@/types/admin'

interface ExistingMovie {
  title: string
  year?: number | null
  kmdb_id?: string | null
  kmdb_movie_seq?: string | null
}

const normTitle = (s: string) => s.normalize('NFKC').replace(/[\s·:,.!?'"()[\]-]+/g, '').toLowerCase()

/**
 * KMDb 검색 결과 중 "제목이 같고 DB에 아직 없는" 영화를 고른다.
 *
 * 2026-10 「파계 (1974)」: 서울영화센터가 김기영 감독의 1974년작을 걸었는데 DB에는 1980·1959년작만 있어
 * 검수 메시지가 두 개 중에서만 고르게 했다 — 정답이 선택지에 없었다. 극장이 적은 연도와 맞는 후보를
 * 앞에 둔다. 연도가 없으면 최근작부터.
 */
export function pickKmdbAlternatives(
  results: readonly AdminExternalMovie[],
  title: string,
  existing: readonly ExistingMovie[],
  listingYears: readonly number[],
  limit = 3,
): AdminExternalMovie[] {
  const want = normTitle(title)
  const inDb = (m: AdminExternalMovie) => existing.some((e) =>
    (e.kmdb_id && e.kmdb_movie_seq && e.kmdb_id === m.movieId && e.kmdb_movie_seq === m.movieSeq)
    || (normTitle(e.title) === normTitle(m.title) && e.year != null && e.year === m.year),
  )
  const years = new Set(listingYears)
  const seen = new Set<string>()
  return results
    .filter((m) => normTitle(m.title) === want && !inDb(m))
    .filter((m) => {
      const key = `${m.movieId}/${m.movieSeq}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => Number(years.has(b.year)) - Number(years.has(a.year)) || b.year - a.year)
    .slice(0, limit)
}

/** 극장 표기 연도와 맞는 후보 번호(1부터) — 없으면 undefined */
export function yearMatchIndex(listingYears: readonly number[], optionYears: readonly (number | null | undefined)[]): number | undefined {
  const years = new Set(listingYears)
  const hits = optionYears.flatMap((y, i) => (y != null && years.has(y) ? [i] : []))
  return hits.length === 1 ? hits[0] : undefined
}
