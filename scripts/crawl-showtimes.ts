/**
 * 상영시간표 전체 수집 스크립트
 * 실행: npx tsx --env-file=.env.local scripts/crawl-showtimes.ts
 */
import type { CrawlRun } from '../src/types/admin'
import { autoMatchShowtimeCandidates } from '../src/lib/admin/store'
import { runAllSources } from '../src/lib/crawl/run-all-sources'
import { notifyDiscord, notifyDiscordError, notifyDiscordMatch, notifyDiscordStart } from '../src/lib/crawl/notify-discord'

function formatRun(current: number, total: number, run: CrawlRun) {
  const progress = `[${String(current).padStart(String(total).length, ' ')}/${total}]`
  if (run.status === 'completed') {
    const warn = run.warningCount > 0 ? ` (경고 ${run.warningCount}건)` : ''
    console.log(`✅ ${progress} ${run.sourceName}: ${run.createdCount}개 수집${warn}`)
  } else {
    console.log(`⚠️  ${progress} ${run.sourceName}: ${run.error}`)
  }
}

async function main() {
  console.log(`[${new Date().toISOString()}] 상영시간표 수집 시작`)
  await notifyDiscordStart('📽 상영시간표 수집')

  // 2단계: 크롤
  const crawlResult = await runAllSources((current, total, run) => {
    formatRun(current, total, run)
  })

  const ok = crawlResult.runs.filter((r) => r.status === 'completed')
  const failed = crawlResult.runs.filter((r) => r.status === 'failed')
  const totalNew = ok.reduce((s, r) => s + r.createdCount, 0)
  console.log(`\n총 ${totalNew}개 후보 수집 (${(crawlResult.durationMs / 1000).toFixed(1)}s)`)
  if (failed.length) console.log(`수집 불가 ${failed.length}건: ${failed.map((r) => r.sourceName).join(', ')}`)

  await notifyDiscord({ title: '📽 수집 완료', runs: crawlResult.runs, durationMs: crawlResult.durationMs })

  // 3단계: 자동매칭
  console.log('\n자동매칭 시작...')
  const matchStart = Date.now()
  const matchResult = await autoMatchShowtimeCandidates()
  const matchDuration = Date.now() - matchStart
  console.log(`자동매칭 완료: ${matchResult.matched}개 매칭, ${matchResult.needsReview}개 검토필요 (${(matchDuration / 1000).toFixed(1)}s)`)

  await notifyDiscordMatch(matchResult.matched, matchResult.needsReview, matchDuration)

  if (ok.length === 0) {
    console.error('모든 소스 수집 실패')
    process.exit(1)
  }
}

main().catch(async (err: unknown) => {
  console.error('수집 중 치명적 오류:', err)
  const msg = err instanceof Error ? err.message : String(err)
  await notifyDiscordError('📽 상영시간표 수집', msg)
  process.exit(1)
})
