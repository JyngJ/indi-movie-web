/**
 * 상영작 탭 섹션 순서 — 섹션 점수(sectionScores) × 오늘 상영작 수.
 * 점수는 지난 30일 반응이고, 오늘 그 섹션에 들어 있는 상영작이 적으면 같은 점수라도 내린다.
 * 점수가 없는 섹션(신규·계측 전)은 평균(1)으로 두고, 같으면 원래 순서를 지킨다.
 */
export interface OrderableSection { listId: string; movies: readonly unknown[]; loading?: boolean }

/** 이 편수 이상이면 상영작 수로 깎지 않는다 */
export const SECTION_FULL_MOVIE_COUNT = 8

export function sectionWeight(score: number | undefined, movieCount: number): number {
  const availability = Math.sqrt(Math.min(1, movieCount / SECTION_FULL_MOVIE_COUNT))
  return (score ?? 1) * availability
}

export function orderSections<T extends OrderableSection>(sections: T[], scores: ReadonlyMap<string, number> | null): T[] {
  // 점수를 못 받았으면 원래 순서.
  if (!scores || scores.size === 0) return sections
  // 불러오는 중인 섹션은 편수를 모르니 꽉 찬 것으로 둔다 — 자리를 먼저 잡고, 다 불러온 뒤엔
  // 편수가 모자란 경우에만 움직인다.
  return sections
    .map((s, index) => ({ s, index, w: sectionWeight(scores.get(s.listId), s.loading ? SECTION_FULL_MOVIE_COUNT : s.movies.length) }))
    .sort((a, b) => b.w - a.w || a.index - b.index)
    .map(x => x.s)
}
