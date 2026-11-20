import type { SyncReleasesSummary } from './syncReleases'
import type { ReleaseSource } from './types'

/**
 * 개봉 예정 수집 1회 실행의 PostHog 이벤트(순수 함수).
 * 날짜별로 수집량·연결·가져오기·검토 필요가 어떻게 움직이는지 보려고 남긴다.
 * 건수와 제목 목록만 담는다 — 사용자 정보는 없다.
 */
export const RELEASES_CRAWL_EVENT = 'releases crawl completed'
export const RELEASES_CRAWL_FAILED_EVENT = 'releases crawl failed'

export function releasesCrawlDistinctId(source: ReleaseSource) {
  return `crawler:releases:${source}`
}

export function buildReleasesCrawlProperties(source: ReleaseSource, summary: SyncReleasesSummary, durationMs: number) {
  return {
    source,
    duration_ms: Math.round(durationMs),
    fetched: summary.fetched,
    created: summary.created,
    matched: summary.matched,
    imported: summary.imported.length,
    needs_review: summary.needsReview.length,
    pending: summary.pending.length,
    stale_pending: summary.stalePending.length,
    date_changed: summary.dateChanged.length,
    release_date_updates: summary.releaseDateUpdates,
    // 건수가 튈 때 무엇이 움직였는지 이벤트만 보고 알 수 있게 제목을 같이 둔다(하루 몇 편 수준)
    imported_titles: summary.imported,
    needs_review_titles: summary.needsReview.map((r) => r.title),
    date_changed_titles: summary.dateChanged.map((d) => `${d.title}: ${d.from} → ${d.to}`),
  }
}

export function buildReleasesCrawlFailedProperties(source: ReleaseSource, error: unknown, durationMs: number) {
  const message = error instanceof Error ? error.message : String(error)
  return { source, duration_ms: Math.round(durationMs), error: message.slice(0, 300) }
}
