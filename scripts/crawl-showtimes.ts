/**
 * 상영시간표 전체 수집 스크립트
 * 실행: npx tsx --env-file=.env.local scripts/crawl-showtimes.ts
 * GitHub Actions에서도 동일하게 사용
 */
import { runAllSources } from '../src/lib/crawl/run-all-sources'
import { notifyDiscord } from '../src/lib/crawl/notify-discord'

async function main() {
  console.log(`[${new Date().toISOString()}] 상영시간표 수집 시작`)

  const result = await runAllSources()

  const ok = result.runs.filter((r) => r.status === 'completed')
  const failed = result.runs.filter((r) => r.status === 'failed')
  const totalNew = ok.reduce((s, r) => s + r.createdCount, 0)

  for (const run of result.runs) {
    const icon = run.status === 'completed' ? '✅' : '❌'
    const detail = run.status === 'completed'
      ? `${run.createdCount}개 수집, 경고 ${run.warningCount}건`
      : run.error
    console.log(`${icon} ${run.sourceName}: ${detail}`)
  }

  console.log(`\n총 ${totalNew}개 후보 수집 (${(result.durationMs / 1000).toFixed(1)}s)`)
  if (failed.length) console.log(`실패 ${failed.length}건: ${failed.map((r) => r.sourceName).join(', ')}`)

  await notifyDiscord({
    title: '📽 상영시간표 수집',
    runs: result.runs,
    durationMs: result.durationMs,
  })

  process.exit(failed.length > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('수집 중 치명적 오류:', err)
  process.exit(1)
})
