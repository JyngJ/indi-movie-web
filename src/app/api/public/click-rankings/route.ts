// 최근 7일 인기 랭킹(예매 클릭 / 상세 조회).
// 판단은 lib/rankings/loadClickRankings.ts가 한다 — 스냅샷(click_rankings) 우선, 낡았을 때만 PostHog,
// 실패는 캐시되는 200으로 내보내지 않는다(2026-11-25 장애 기록은 lib/rankings/clickRankings.ts).
// 프로덕션 환경변수: POSTHOG_PERSONAL_API_KEY(query:read) · POSTHOG_PROJECT_ID · SUPABASE_SERVICE_ROLE_KEY

import { after } from 'next/server'
import { loadClickRankings } from '@/lib/rankings/loadClickRankings'
import { queryClickRankingsFromPostHog } from '@/lib/rankings/posthogClickRankings'
import { readClickRankingsSnapshot, writeClickRankingsSnapshot } from '@/lib/rankings/clickRankingsStore'

export const dynamic = 'force-dynamic'
/* 최악의 경로: 스냅샷 읽기 2초 + PostHog 병렬 4.5초 ≈ 6.5초, 응답 뒤 스냅샷 쓰기 2초.
   제한을 적어 두지 않으면 플랫폼 기본값(수 분)까지 브라우저가 기다릴 수 있었다. */
export const maxDuration = 10

export async function GET() {
  const result = await loadClickRankings({
    readSnapshot: () => readClickRankingsSnapshot(),
    queryLive: () => queryClickRankingsFromPostHog(),
    writeSnapshot: (snapshot) => writeClickRankingsSnapshot(snapshot),
    now: () => new Date(),
  })

  if (result.status === 503) {
    console.error(`[click-rankings] 503 — ${result.reason}`)
    return Response.json(result.body, { status: 503, headers: { 'Cache-Control': result.cacheControl } })
  }

  const persist = result.persist
  if (persist) {
    after(async () => {
      try {
        await persist()
      } catch (error) {
        // 시드 미적용(테이블 없음) 등 — 다음 요청은 다시 PostHog로 간다
        console.warn('[click-rankings] 스냅샷 저장 실패:', error instanceof Error ? error.message : error)
      }
    })
  }

  return Response.json(result.body, {
    headers: {
      'Cache-Control': result.cacheControl,
      'x-click-rankings-source': result.source,
    },
  })
}
