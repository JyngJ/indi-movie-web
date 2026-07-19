import { getFestivalStatus } from '@/lib/festival/status'
import type { InstagramRecommendation } from '@/types/instagramRecommendation'

// ─────────────────────────────────────────────
// 인스타그램 추천 카드 정렬
// "지금 유효"(영화=1편이라도 상영 중 / 영화제=진행중·예정) 먼저 → sort_order → published_at desc
// ─────────────────────────────────────────────

/**
 * display_until이 지났으면 노출 안 함(is_active와 별개 — 쿼리에서도 걸지만, 클라이언트에서도
 * 한 번 더 방어. sitemap.ts의 is_active 필터와 같은 이중 방어 원칙).
 */
export function isInstagramRecVisible(rec: InstagramRecommendation, today: string): boolean {
  if (!rec.isActive) return false
  if (rec.displayUntil && rec.displayUntil < today) return false
  return true
}

export function filterVisibleInstagramRecommendations(
  recs: InstagramRecommendation[],
  today: string,
): InstagramRecommendation[] {
  return recs.filter((r) => isInstagramRecVisible(r, today))
}

/**
 * 카드가 "지금 유효"한지 — 영화는 연결된 영화 중 하나라도 상영 중이면 true(1편이든 여러 편이든),
 * 영화제는 종료가 아니면(진행중/예정) true. 연결이 다 끊긴(movies 비었거나 festival이 null) 카드는 false.
 */
export function isInstagramRecActiveNow(
  rec: InstagramRecommendation,
  activeMovieIds: ReadonlySet<string>,
  today: string,
): boolean {
  if (rec.targetType === 'movie') {
    return rec.movies.some((m) => m.movie && activeMovieIds.has(m.movie.id))
  }
  if (!rec.festival) return false
  return getFestivalStatus(rec.festival.startDate, rec.festival.endDate, today) !== 'ended'
}

export function sortInstagramRecommendations(
  recs: InstagramRecommendation[],
  activeMovieIds: ReadonlySet<string>,
  today: string,
): InstagramRecommendation[] {
  return [...recs].sort((a, b) => {
    const aActive = isInstagramRecActiveNow(a, activeMovieIds, today)
    const bActive = isInstagramRecActiveNow(b, activeMovieIds, today)
    if (aActive !== bActive) return aActive ? -1 : 1

    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder

    const aPublished = a.publishedAt ?? ''
    const bPublished = b.publishedAt ?? ''
    return bPublished.localeCompare(aPublished)
  })
}
