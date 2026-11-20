/**
 * 개봉 예정 독립영화 수집 (인디그라운드) — 하루 1회 크론.
 * 실행: npm run crawl:releases            (저장)
 *       npm run crawl:releases -- --dry-run  (읽고 판정만, DB에 쓰지 않음)
 * 설계: docs/PLAN-indieground-releases.md
 */
import { importAdminExternalMovie } from '../src/lib/admin/store'
import { searchKmdbMovies } from '../src/lib/admin/kmdb'
import { notifyDiscordError, notifyDiscordReleases } from '../src/lib/crawl/notify-discord'
import { fetchIndiegroundDetail, fetchIndiegroundReleases } from '../src/lib/releases/indiegroundClient'
import { createSupabaseReleaseRepository } from '../src/lib/releases/supabaseReleaseRepository'
import { syncReleases } from '../src/lib/releases/syncReleases'
import { createSupabaseAdminClient } from '../src/lib/supabase/admin'
import { captureServerEvent } from '../src/lib/analytics/captureServerEvent'
import {
  RELEASES_CRAWL_EVENT,
  RELEASES_CRAWL_FAILED_EVENT,
  buildReleasesCrawlFailedProperties,
  buildReleasesCrawlProperties,
  releasesCrawlDistinctId,
} from '../src/lib/releases/syncMetrics'
import type { AdminExternalMovie } from '../src/types/admin'

const TITLE = '🎬 개봉 예정 수집'

const dryRun = process.argv.includes('--dry-run')
const startedAt = Date.now()

async function main() {
  console.log(`[${new Date().toISOString()}] 개봉 예정 수집 시작${dryRun ? ' (dry-run)' : ''}`)

  const summary = await syncReleases<AdminExternalMovie & { key: string }>({
    source: 'indieground',
    repo: createSupabaseReleaseRepository(createSupabaseAdminClient()),
    fetchReleases: fetchIndiegroundReleases,
    searchExternal: async (title) => (await searchKmdbMovies(title)).map((m) => ({ ...m, key: m.externalId, directors: m.director })),
    fetchDirectors: async (seq) => (await fetchIndiegroundDetail(seq)).directors,
    importExternal: async ({ key: _key, directors: _directors, ...movie }) => (await importAdminExternalMovie(movie)).id,
    now: () => new Date(),
    dryRun,
    log: (line) => console.log(line),
  })

  console.log(JSON.stringify(summary, null, 2))
  if (dryRun) return
  await notifyDiscordReleases(summary)
  // 실행마다 얼마나 했는지 PostHog에 남긴다 — 토큰이 없거나 실패해도 수집 결과에는 영향 없음
  const logged = await captureServerEvent(RELEASES_CRAWL_EVENT, releasesCrawlDistinctId('indieground'),
    buildReleasesCrawlProperties('indieground', summary, Date.now() - startedAt))
  console.log(`PostHog 기록 ${logged ? '완료' : '건너뜀'}`)
}

main().catch(async (err: unknown) => {
  console.error('개봉 예정 수집 실패:', err)
  // dry-run은 사람이 터미널에서 돌리는 확인용 — 운영 채널에 오류를 올리지 않는다
  if (!dryRun) {
    await notifyDiscordError(TITLE, err instanceof Error ? err.message : String(err))
    await captureServerEvent(RELEASES_CRAWL_FAILED_EVENT, releasesCrawlDistinctId('indieground'),
      buildReleasesCrawlFailedProperties('indieground', err, Date.now() - startedAt))
  }
  process.exit(1)
})
