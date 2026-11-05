import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { toKstIsoDate } from '@/lib/date'
import type { SourceHealthInput } from './sourceHealth'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PAGE = 1000
const LOOKBACK_DAYS = 14

/**
 * 판정 재료 — 켜진 수집처와 최근 2주 실행 기록(좌석 갱신 seat_* 제외), 극장별 예정 상영 수,
 * 수집처별 검수 대기 회차 수.
 * 순수 판정은 sourceHealth.ts가 한다.
 */
export async function loadSourceHealthInputs(): Promise<{ sources: SourceHealthInput[]; upcomingByTheater: Map<string, number> }> {
  const supabase = createSupabaseAdminClient()
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86400000).toISOString()

  const { data: sourceRows, error: sourceError } = await supabase
    .from('crawl_sources')
    .select('id, theater_name, parser, theater_id, matched_theater_id')
    .eq('enabled', true)
  if (sourceError) throw new Error(`수집처 조회 실패: ${sourceError.message}`)

  const runsBySource = new Map<string, SourceHealthInput['runs']>()
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from('crawl_runs')
      .select('source_id, started_at, created_count, status')
      .gte('started_at', since)
      .not('id', 'like', 'seat_%')
      .order('started_at', { ascending: false })
      .range(offset, offset + PAGE - 1)
    if (error) throw new Error(`수집 기록 조회 실패: ${error.message}`)
    for (const r of data ?? []) {
      const list = runsBySource.get(r.source_id) ?? []
      list.push({ startedAt: r.started_at, createdCount: r.created_count, status: r.status })
      runsBySource.set(r.source_id, list)
    }
    if (!data || data.length < PAGE) break
  }

  const upcomingByTheater = new Map<string, number>()
  const today = toKstIsoDate(new Date())
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from('showtimes')
      .select('theater_id')
      .eq('is_active', true)
      .gte('show_date', today)
      .order('id')
      .range(offset, offset + PAGE - 1)
    if (error) throw new Error(`예정 상영 조회 실패: ${error.message}`)
    for (const r of data ?? []) upcomingByTheater.set(r.theater_id, (upcomingByTheater.get(r.theater_id) ?? 0) + 1)
    if (!data || data.length < PAGE) break
  }

  const pendingBySource = new Map<string, number>()
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from('showtime_candidates')
      .select('source_id')
      .eq('status', 'needs_review')
      .gte('show_date', today)
      .order('id')
      .range(offset, offset + PAGE - 1)
    if (error) throw new Error(`검수 대기 회차 조회 실패: ${error.message}`)
    for (const r of data ?? []) pendingBySource.set(r.source_id, (pendingBySource.get(r.source_id) ?? 0) + 1)
    if (!data || data.length < PAGE) break
  }

  const sources: SourceHealthInput[] = (sourceRows ?? []).map((s) => {
    const theaterId = [s.matched_theater_id, s.theater_id].find((v): v is string => typeof v === 'string' && UUID.test(v)) ?? null
    return {
      sourceId: s.id,
      sourceName: s.theater_name,
      parser: s.parser,
      theaterId,
      runs: runsBySource.get(s.id) ?? [],
      pendingReviewUpcoming: pendingBySource.get(s.id) ?? 0,
    }
  })
  return { sources, upcomingByTheater }
}
