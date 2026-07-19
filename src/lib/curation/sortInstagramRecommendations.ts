import { getFestivalStatus } from '@/lib/festival/status'
import type { InstagramRecommendation } from '@/types/instagramRecommendation'

// ─────────────────────────────────────────────
// 인스타그램 추천 카드 정렬
// "지금 유효"(영화=상영 중 / 영화제=진행중·예정) 먼저 → sort_order → published_at desc
// ─────────────────────────────────────────────

/**
 * 카드가 "지금 유효"한지 — 영화는 상영 중(activeMovieIds), 영화제는 종료가 아니면(진행중/예정) true.
 * 연결이 끊긴(movie/festival이 null) 카드는 항상 false.
 */
export function isInstagramRecActiveNow(
  rec: InstagramRecommendation,
  activeMovieIds: ReadonlySet<string>,
  today: string,
): boolean {
  if (rec.targetType === 'movie') {
    if (!rec.movie) return false
    return activeMovieIds.has(rec.movie.id)
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
