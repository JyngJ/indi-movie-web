// ================================
// 인기 랭킹 응답 고르기 (application) — 저장소·PostHog는 포트로 받는다
// ================================

import {
  CLICK_RANKINGS_CACHE,
  isSnapshotFresh,
  isSnapshotUsableAsFallback,
  type ClickRankingsSnapshot,
  type ClickRankingsSource,
  type RankingEntry,
} from './clickRankings'

export interface ClickRankingsPorts {
  /** 마지막 스냅샷. 없거나 읽기 실패면 null — 던지지 않는다 */
  readSnapshot: () => Promise<ClickRankingsSnapshot | null>
  /** PostHog 실시간 집계. 두 쿼리 중 하나라도 실패하거나 시간을 넘기면 던진다 */
  queryLive: () => Promise<{ booking: RankingEntry[]; views: RankingEntry[] }>
  /** 성공한 실시간 집계를 스냅샷으로 남긴다. 응답을 막지 않도록 호출부가 응답 뒤로 미룬다 */
  writeSnapshot: (snapshot: ClickRankingsSnapshot) => Promise<void>
  now: () => Date
}

export type ClickRankingsResult =
  | {
      status: 200
      source: ClickRankingsSource
      body: ClickRankingsSnapshot
      cacheControl: string
      /** 응답 뒤에 실행할 스냅샷 쓰기(실시간 집계가 성공했을 때만) */
      persist?: () => Promise<void>
    }
  | {
      status: 503
      body: { error: string }
      cacheControl: typeof CLICK_RANKINGS_CACHE.failure
      /** 로그용 — 응답에는 싣지 않는다 */
      reason: string
    }

export async function loadClickRankings(ports: ClickRankingsPorts): Promise<ClickRankingsResult> {
  const snapshot = await ports.readSnapshot()
  if (isSnapshotFresh(snapshot, ports.now())) {
    return { status: 200, source: 'snapshot', body: snapshot, cacheControl: CLICK_RANKINGS_CACHE.ok }
  }

  try {
    const live = await ports.queryLive()
    const body: ClickRankingsSnapshot = { ...live, computedAt: ports.now().toISOString() }
    return {
      status: 200,
      source: 'live',
      body,
      cacheControl: CLICK_RANKINGS_CACHE.ok,
      persist: () => ports.writeSnapshot(body),
    }
  } catch (error) {
    const reason = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    if (isSnapshotUsableAsFallback(snapshot, ports.now())) {
      return { status: 200, source: 'stale-snapshot', body: snapshot, cacheControl: CLICK_RANKINGS_CACHE.stale }
    }
    return {
      status: 503,
      body: { error: '인기 랭킹을 불러오지 못했어요' },
      cacheControl: CLICK_RANKINGS_CACHE.failure,
      reason,
    }
  }
}
