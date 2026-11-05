/** 섹션 점수 어댑터 — PostHog에서 자리별 노출·클릭을 읽고 Supabase에 점수를 쓴다. */
import { hogql, POSTHOG_EXCLUDE_INTERNAL, POSTHOG_PROD_HOST } from '@/lib/analytics/posthogQuery'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { SectionPositionStat, SectionScore } from './sectionScores'

/** 상영작 탭 순번이 있는 섹션(renderRun)만. 노출은 dwell, 클릭은 같은 세션·같은 섹션의 영화 선택. */
export async function fetchSectionPositionStats(days: number): Promise<SectionPositionStat[]> {
  const where = `properties.$host = '${POSTHOG_PROD_HOST}' and timestamp >= now() - interval ${Math.floor(days)} day and ${POSTHOG_EXCLUDE_INTERNAL}`
  const rows = await hogql(`
    with seen as (
      select toString(properties.list_id) as lid, toInt(properties.position) as pos, $session_id as sid
      from events
      where event = 'curation section dwell' and ${where} and properties.source = 'films_tab' and properties.position is not null
        and properties.list_id != 'all_movies_cta'
      group by lid, pos, sid
    ),
    clk as (
      select toString(properties.list_id) as lid, $session_id as sid
      from events where event = 'curation movie selected' and ${where}
      group by lid, sid
    )
    select seen.lid, seen.pos, count() as impressions, countIf(clk.sid != '') as clicks
    from seen left join clk on clk.lid = seen.lid and clk.sid = seen.sid
    group by seen.lid, seen.pos
    limit 10000`)
  return (rows as [string, number, number, number][])
    .filter(([lid]) => !!lid)
    .map(([listId, position, impressions, clicks]) => ({ listId, position: Number(position), impressions: Number(impressions), clicks: Number(clicks) }))
}

export async function replaceSectionScores(scores: SectionScore[], computedAt: string): Promise<void> {
  const db = createSupabaseAdminClient()
  const rows = scores.map(s => ({ list_id: s.listId, score: s.score, impressions: s.impressions, clicks: s.clicks, expected_clicks: s.expectedClicks, computed_at: computedAt }))
  const { error } = await db.from('curation_section_score').upsert(rows, { onConflict: 'list_id' })
  if (error) throw error
  const { error: deleteError } = await db.from('curation_section_score').delete().lt('computed_at', computedAt)
  if (deleteError) throw deleteError
}
