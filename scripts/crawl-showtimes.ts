/**
 * 상영시간표 전체 수집 스크립트
 * 실행: npx tsx --env-file=.env.local scripts/crawl-showtimes.ts
 * GitHub Actions에서도 동일하게 사용
 */
import type { CrawlRun } from '../src/types/admin'
import { runAllSources } from '../src/lib/crawl/run-all-sources'
import { notifyDiscord } from '../src/lib/crawl/notify-discord'

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

  const result = await runAllSources((current, total, run) => {
    formatRun(current, total, run)
  })

  const ok = result.runs.filter((r) => r.status === 'completed')
  const failed = result.runs.filter((r) => r.status === 'failed')
  const totalNew = ok.reduce((s, r) => s + r.createdCount, 0)

  console.log(`\n총 ${totalNew}개 후보 수집, 자동매칭 ${result.matched}개 (${(result.durationMs / 1000).toFixed(1)}s)`)
  if (failed.length) console.log(`수집 불가 ${failed.length}건: ${failed.map((r) => r.sourceName).join(', ')}`)

  await notifyDiscord({
    title: '📽 상영시간표 수집',
    runs: result.runs,
    durationMs: result.durationMs,
    matched: result.matched,
  })

  // fetch failed 같은 네트워크 에러만 있을 경우 workflow를 실패로 처리하지 않음
  // 수집 자체가 0건이고 성공한 소스도 없을 때만 exit 1
  const hasAnySuccess = ok.length > 0
  if (!hasAnySuccess) {
    console.error('모든 소스 수집 실패')
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('수집 중 치명적 오류:', err)
  process.exit(1)
})
