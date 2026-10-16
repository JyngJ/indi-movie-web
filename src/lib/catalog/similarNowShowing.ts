// ================================
// 상영 없는 영화 상세 — "지금 볼 수 있는 비슷한 영화" 고르기 (순수 함수)
// ================================

export interface SimilarCandidate {
  id: string
  title: string
  year: number | null
  director: string[]
  nation: string | null
  posterUrl: string | null
}

export type SimilarReason = 'director' | 'nation'

export interface SimilarPick extends SimilarCandidate {
  reason: SimilarReason
}

const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase()
/** "한국, 프랑스"처럼 공동 제작이면 나라가 여러 개 — src/lib/nations.ts와 같은 구분자 */
const nations = (s: string | null | undefined) => new Set((s ?? '').split(/[,，/·]+/).map(norm).filter(Boolean))

/**
 * 상영 중인 영화 중에서 같은 감독 → 같은 제작 국가 순으로 고른다.
 * 관계없는 영화로 칸을 채우지 않는다 — 어느 영화 페이지에서나 같은 "이번 주 상영작" 목록이 붙으면
 * 페이지끼리 내용이 겹쳐 색인 품질 판정(2026-10 애드센스 "가치 없는 콘텐츠" 거절)을 오히려 해친다.
 * 국가 기준은 연도가 가까운 순으로 정렬해 같은 시대 작품이 먼저 오게 한다.
 */
export function pickSimilarNowShowing(
  movie: { id: string; director: string[]; nation?: string | null; year?: number | null },
  showing: readonly SimilarCandidate[],
  limit = 6,
): SimilarPick[] {
  const directors = new Set(movie.director.map(norm).filter(Boolean))
  const ownNations = nations(movie.nation)
  const others = showing.filter((m) => m.id !== movie.id)

  const byDirector = others.filter((m) => m.director.some((d) => directors.has(norm(d))))
  const taken = new Set(byDirector.map((m) => m.id))

  const yearGap = (m: SimilarCandidate) =>
    movie.year && m.year ? Math.abs(movie.year - m.year) : Number.MAX_SAFE_INTEGER
  const byNation = ownNations.size > 0
    ? others
      .filter((m) => !taken.has(m.id) && [...nations(m.nation)].some((n) => ownNations.has(n)))
      .sort((a, b) => yearGap(a) - yearGap(b) || a.title.localeCompare(b.title, 'ko'))
    : []

  return [
    ...byDirector.map((m) => ({ ...m, reason: 'director' as const })),
    ...byNation.map((m) => ({ ...m, reason: 'nation' as const })),
  ].slice(0, limit)
}
