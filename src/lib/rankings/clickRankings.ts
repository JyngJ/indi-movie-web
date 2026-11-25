// ================================
// 최근 7일 인기 랭킹(예매 클릭 · 상세 조회) — 도메인 규칙 (순수 모듈)
// ================================

/*
 * 2026-11-25 12:00 KST 장애 기록:
 * - 상영작 탭 '지금 가장 많이 찾는 영화'가 iPhone에서 1분 넘게 스켈레톤으로 남았다.
 * - 원인은 요청 경로에서 PostHog HogQL을 직접 부른 것이었다(타임아웃 없음). PostHog 쪽에서
 *   두 쿼리 모두 10·12초 뒤 TIMEOUT_EXCEEDED가 났고, 재실행이 12:01:08에 끝날 때까지 응답이 없었다.
 * - 더 큰 위험도 있었다. PostHog가 오류를 주면 빈 배열을 200 + s-maxage=21600으로 내보냈다.
 *   그러면 CDN이 그 빈 응답을 6시간(+SWR 24시간) 동안 모든 사용자에게 돌려주고, 섹션이 통째로 사라진다.
 *
 * 그래서 규칙을 이렇게 정한다.
 * 1. 랭킹은 스냅샷(click_rankings 테이블)에서 읽는다. 크론과 라우트가 성공했을 때만 쓴다.
 * 2. 스냅샷이 낡았을 때만 PostHog를 짧은 타임아웃으로 부른다. 두 쿼리가 모두 성공해야 성공이다.
 * 3. 실패를 캐시되는 200으로 내보내지 않는다. 낡은 스냅샷이 있으면 짧게 캐시해서 내주고,
 *    그것도 없으면 503 + no-store로 답한다. 화면은 오류면 섹션을 숨긴다.
 */

export interface RankingEntry {
  movieId: string
  count: number
}

export interface ClickRankingsSnapshot {
  booking: RankingEntry[]
  views: RankingEntry[]
  /** ISO 시각 — 집계한 때 */
  computedAt: string
}

/** 응답의 출처 — 응답 헤더 x-click-rankings-source에도 실린다 */
export type ClickRankingsSource = 'snapshot' | 'live' | 'stale-snapshot'

/** 이보다 젊은 스냅샷은 PostHog를 부르지 않고 그대로 쓴다. 크론은 1시간마다 도는 것을 전제로 한다 */
export const SNAPSHOT_FRESH_MS = 3 * 60 * 60 * 1000
/** PostHog가 실패했을 때 이만큼까지 낡은 스냅샷은 대신 내준다. 7일 창 집계라 하루이틀 낡아도 순위는 거의 같다 */
export const SNAPSHOT_FALLBACK_MAX_MS = 7 * 24 * 60 * 60 * 1000

/** PostHog 쿼리 하나의 제한 시간. 두 쿼리는 병렬이다 — 평소에는 1~1.5초 걸린다(2026-11-25 query_log) */
export const LIVE_QUERY_TIMEOUT_MS = 4500
/** 스냅샷 읽기·쓰기 제한 시간 */
export const SNAPSHOT_IO_TIMEOUT_MS = 2000

export const CLICK_RANKINGS_CACHE = {
  /** 정상 응답 — 30분 캐시, 만료 뒤 3시간은 캐시를 먼저 내주고 뒤에서 갱신 */
  ok: 'public, s-maxage=1800, stale-while-revalidate=10800',
  /** PostHog 실패로 낡은 스냅샷을 내줄 때 — 짧게만 캐시해 회복되면 곧 새 값으로 바뀌게 */
  stale: 'public, s-maxage=300, stale-while-revalidate=600',
  /** 줄 값이 없을 때 — CDN·브라우저 어디에도 남기지 않는다 */
  failure: 'no-store',
} as const

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/** HogQL 결과 행([movie_id, count]) → 랭킹. movie_id가 UUID가 아닌 행(잘못 찍힌 경로 등)은 버린다 */
export function toRanking(rows: readonly unknown[][]): RankingEntry[] {
  return rows
    .filter((row) => UUID_RE.test(String(row[0])))
    .map((row) => ({ movieId: String(row[0]), count: Number(row[1]) }))
    .filter((entry) => Number.isFinite(entry.count))
}

export function snapshotAgeMs(snapshot: ClickRankingsSnapshot, now: Date): number {
  const at = Date.parse(snapshot.computedAt)
  return Number.isFinite(at) ? now.getTime() - at : Number.POSITIVE_INFINITY
}

export function isSnapshotFresh(snapshot: ClickRankingsSnapshot | null, now: Date): snapshot is ClickRankingsSnapshot {
  if (!snapshot) return false
  const age = snapshotAgeMs(snapshot, now)
  return age >= 0 && age < SNAPSHOT_FRESH_MS
}

export function isSnapshotUsableAsFallback(snapshot: ClickRankingsSnapshot | null, now: Date): snapshot is ClickRankingsSnapshot {
  if (!snapshot) return false
  const age = snapshotAgeMs(snapshot, now)
  return age >= 0 && age < SNAPSHOT_FALLBACK_MAX_MS
}

/** 저장소에서 읽은 JSON이 스냅샷 모양인지 — 손상된 행은 없는 것으로 친다 */
export function parseSnapshot(value: { booking?: unknown; views?: unknown; computed_at?: unknown } | null | undefined): ClickRankingsSnapshot | null {
  if (!value || typeof value.computed_at !== 'string') return null
  if (!Array.isArray(value.booking) || !Array.isArray(value.views)) return null
  const clean = (list: unknown[]): RankingEntry[] => list.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const { movieId, count } = item as { movieId?: unknown; count?: unknown }
    return typeof movieId === 'string' && UUID_RE.test(movieId) && Number.isFinite(Number(count))
      ? [{ movieId, count: Number(count) }]
      : []
  })
  return { booking: clean(value.booking), views: clean(value.views), computedAt: value.computed_at }
}
