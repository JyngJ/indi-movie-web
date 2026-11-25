/**
 * 최근 7일 인기 랭킹(예매 클릭 · 상세 조회)을 PostHog에서 집계해 click_rankings에 저장한다.
 * 사용법: npm run curate:click-rankings
 *
 * 왜 사전 집계인가 — 공개 API가 요청마다 PostHog를 부르면 PostHog가 느릴 때 사용자가 그만큼 기다린다.
 * 2026-11-25 12:00 KST 두 쿼리가 10·12초 뒤 TIMEOUT_EXCEEDED가 나 랭킹 섹션이 1분 넘게 스켈레톤이었다.
 * 크론이 스냅샷을 1시간마다 채우면 공개 API는 DB만 읽는다(lib/rankings/loadClickRankings.ts).
 *
 * 최초 실행 전 Supabase에서 supabase/seeds/18_click_rankings.sql 실행 필요.
 * 환경변수: POSTHOG_PERSONAL_API_KEY · POSTHOG_PROJECT_ID · NEXT_PUBLIC_SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY
 * 크론(제안, 아직 등록하지 않음): docs/RUNBOOK-crawler.md crontab 표 참고.
 */

import { queryClickRankingsFromPostHog } from '../src/lib/rankings/posthogClickRankings'
import { writeClickRankingsSnapshot } from '../src/lib/rankings/clickRankingsStore'

/* 공개 API(4.5초)와 달리 기다려 줄 사람이 없다. PostHog가 느린 날에도 끝까지 받는다 */
const SCRIPT_QUERY_TIMEOUT_MS = 60_000
const SCRIPT_WRITE_TIMEOUT_MS = 15_000

async function main() {
  const startedAt = Date.now()
  const live = await queryClickRankingsFromPostHog({ timeoutMs: SCRIPT_QUERY_TIMEOUT_MS })
  const computedAt = new Date().toISOString()
  await writeClickRankingsSnapshot({ ...live, computedAt }, { timeoutMs: SCRIPT_WRITE_TIMEOUT_MS })
  console.log(`[click-rankings] 저장 완료 — 예매 ${live.booking.length}편 · 조회 ${live.views.length}편 · ${Date.now() - startedAt}ms · ${computedAt}`)
}

main().catch((error) => {
  // 실패해도 이전 스냅샷이 남아 있다. API는 7일까지 낡은 스냅샷을 대신 내준다
  console.error('[click-rankings] 실패:', error instanceof Error ? error.message : error)
  process.exit(1)
})
