// ================================
// 인기 랭킹 스냅샷 저장소 — Supabase 어댑터 (infrastructure)
// 테이블: supabase/seeds/18_click_rankings.sql
// ================================

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { SNAPSHOT_IO_TIMEOUT_MS, parseSnapshot, type ClickRankingsSnapshot } from './clickRankings'

const TABLE = 'click_rankings'
const ROW_ID = 1

/**
 * 마지막 스냅샷. 테이블이 아직 없거나(시드 미적용), 행이 없거나, 읽기가 실패·지연되면 null.
 * 이 경로가 실패해도 공개 API는 PostHog로 넘어가야 하므로 던지지 않는다.
 */
export async function readClickRankingsSnapshot(
  { timeoutMs = SNAPSHOT_IO_TIMEOUT_MS }: { timeoutMs?: number } = {},
): Promise<ClickRankingsSnapshot | null> {
  try {
    const { data, error } = await createSupabaseAdminClient()
      .from(TABLE)
      .select('booking, views, computed_at')
      .eq('id', ROW_ID)
      .abortSignal(AbortSignal.timeout(timeoutMs))
      .maybeSingle()
    if (error) return null
    return parseSnapshot(data)
  } catch {
    return null
  }
}

/** 스냅샷을 덮어쓴다. 실패하면 던진다 — 크론은 실패로 알리고, 공개 API는 응답 뒤에 삼킨다 */
export async function writeClickRankingsSnapshot(
  snapshot: ClickRankingsSnapshot,
  { timeoutMs = SNAPSHOT_IO_TIMEOUT_MS }: { timeoutMs?: number } = {},
): Promise<void> {
  const { error } = await createSupabaseAdminClient()
    .from(TABLE)
    .upsert({ id: ROW_ID, booking: snapshot.booking, views: snapshot.views, computed_at: snapshot.computedAt })
    .abortSignal(AbortSignal.timeout(timeoutMs))
  if (error) throw new Error(`click_rankings 저장 실패: ${error.code ?? ''} ${error.message}`)
}
