/**
 * 예매 클릭 랭킹과 상세 조회 랭킹을 하나의 인기 점수로 합친다.
 *
 * 왜 합치나 — 7일 표본이 작아서(예매 86회 · 조회 115회, 2026-08-13 기준) 단독 랭킹은
 * 하위권이 전부 동점이다. 예매 단독 상위 10의 점수 분포가 [18,13,9,6,4,4,3,3,3,3]로,
 * 7~10위를 가르는 게 사실상 노이즈였다. 순위를 포스터에 크게 얹기로 한 이상 그 노이즈를
 * 크게 얹을 수는 없다. 두 랭킹의 상위 10 겹침도 4/10라 나란히 두면 절반이 중복이었다.
 *
 * 왜 예매에 가중치를 주나 — 조회는 목록에서 눌러본 것이고, 예매 클릭은 극장 예매처로
 * 떠난 것이다. 신호의 세기가 다르다. 두 랭킹의 총량이 비슷해서(86 vs 115) 가중치 없이
 * 더하면 조회가 근소하게 지배한다.
 *
 * 왜 하필 2인가 — 실제 데이터로 1·2·3·5를 돌려본 결과다.
 *   ×1: 예매 0인 영화가 6·7·10위를 차지해 예매 신호가 묻힌다
 *   ×2: 상위 10 동점 1건. 두 신호가 모두 살아 있다
 *   ×3 이상: 예매 3회·조회 0인 영화가 조회 11회를 이겨 사실상 예매 단독으로 회귀한다
 */

export interface RankingEntry {
  movieId: string
  count: number
}

export interface PopularRankingItem {
  movieId: string
  score: number
}

/** 예매 클릭 1회 = 상세 조회 2회 */
export const BOOKING_WEIGHT = 2

export function mergePopularRanking(
  booking: RankingEntry[] | undefined,
  views: RankingEntry[] | undefined,
  /** 현재 상영 중이고 실제로 렌더 가능한 영화만 통과시킨다 */
  isEligible: (movieId: string) => boolean,
  limit = 10,
): PopularRankingItem[] {
  const score = new Map<string, number>()

  function accumulate(entries: RankingEntry[] | undefined, weight: number) {
    for (const entry of entries ?? []) {
      if (!isEligible(entry.movieId)) continue
      score.set(entry.movieId, (score.get(entry.movieId) ?? 0) + entry.count * weight)
    }
  }

  accumulate(booking, BOOKING_WEIGHT)
  accumulate(views, 1)

  return [...score]
    .map(([movieId, s]) => ({ movieId, score: s }))
    // 동점은 movieId로 갈라 순서를 고정한다 — 안 그러면 리렌더마다 순위가 뒤바뀐다
    .sort((a, b) => b.score - a.score || a.movieId.localeCompare(b.movieId))
    .slice(0, limit)
}
