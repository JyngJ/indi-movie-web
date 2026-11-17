/**
 * 개봉 예정 독립영화 수집 (인디그라운드) — 하루 1회 크론.
 * 실행: npm run crawl:releases            (저장)
 *       npm run crawl:releases -- --dry-run  (읽고 판정만, DB에 쓰지 않음)
 * 설계: docs/PLAN-indieground-releases.md
 */
import { importAdminExternalMovie } from '../src/lib/admin/store'
import { searchKmdbMovies } from '../src/lib/admin/kmdb'
import { notifyDiscordError, notifyDiscordReleases } from '../src/lib/crawl/notify-discord'
import { fetchIndiegroundReleases } from '../src/lib/releases/indiegroundClient'
import { createSupabaseReleaseRepository } from '../src/lib/releases/supabaseReleaseRepository'
import { syncReleases } from '../src/lib/releases/syncReleases'
import { createSupabaseAdminClient } from '../src/lib/supabase/admin'
import type { AdminExternalMovie } from '../src/types/admin'

const TITLE = '🎬 개봉 예정 수집'

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  console.log(`[${new Date().toISOString()}] 개봉 예정 수집 시작${dryRun ? ' (dry-run)' : ''}`)

  const summary = await syncReleases<AdminExternalMovie & { key: string }>({
    source: 'indieground',
    repo: createSupabaseReleaseRepository(createSupabaseAdminClient()),
    fetchReleases: fetchIndiegroundReleases,
    searchExternal: async (title) => (await searchKmdbMovies(title)).map((m) => ({ ...m, key: m.externalId })),
    importExternal: async (movie) => (await importAdminExternalMovie(movie)).id,
    now: () => new Date(),
    dryRun,
    log: (line) => console.log(line),
  })

  console.log(JSON.stringify(summary, null, 2))
  if (!dryRun) await notifyDiscordReleases(summary)
}

main().catch(async (err: unknown) => {
  console.error('개봉 예정 수집 실패:', err)
  await notifyDiscordError(TITLE, err instanceof Error ? err.message : String(err))
  process.exit(1)
})
