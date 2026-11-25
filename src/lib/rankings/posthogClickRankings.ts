// ================================
// 인기 랭킹 — PostHog 어댑터 (infrastructure)
// ================================

import { hogql } from '@/lib/analytics/posthogQuery'
import { LIVE_QUERY_TIMEOUT_MS, toRanking, type RankingEntry } from './clickRankings'

/** 최근 7일 '예매하러 가기' 클릭 수 — movie_id별 */
export const BOOKING_QUERY = `
  SELECT properties.movie_id AS movie_id, count() AS cnt
  FROM events
  WHERE event = 'booking clicked'
    AND timestamp >= now() - INTERVAL 7 DAY
    AND isNotNull(properties.movie_id)
  GROUP BY movie_id
  ORDER BY cnt DESC
  LIMIT 20
`.trim()

/** 최근 7일 영화 상세 페이지뷰 — /movie/:id + /films/movie/:id */
export const VIEWS_QUERY = `
  SELECT replaceRegexpOne(properties.$pathname, '^(/films)?/movie/', '') AS movie_id, count() AS cnt
  FROM events
  WHERE event = '$pageview'
    AND (properties.$pathname LIKE '/movie/%' OR properties.$pathname LIKE '/films/movie/%')
    AND timestamp >= now() - INTERVAL 7 DAY
  GROUP BY movie_id
  ORDER BY cnt DESC
  LIMIT 20
`.trim()

/**
 * 두 쿼리를 병렬로 부른다. 하나라도 실패하거나 시간을 넘기면 던진다 — 반쪽 결과(예매만 있고 조회는 빈 배열)를
 * 성공으로 내보내면 순위가 조용히 뒤틀린 채 캐시되기 때문이다.
 * 공개 API는 짧은 제한(기본 4.5초), 크론 스크립트는 넉넉한 제한을 준다.
 */
export async function queryClickRankingsFromPostHog(
  { timeoutMs = LIVE_QUERY_TIMEOUT_MS }: { timeoutMs?: number } = {},
): Promise<{ booking: RankingEntry[]; views: RankingEntry[] }> {
  const [booking, views] = await Promise.all([
    hogql(BOOKING_QUERY, { timeoutMs }),
    hogql(VIEWS_QUERY, { timeoutMs }),
  ])
  return { booking: toRanking(booking), views: toRanking(views) }
}
