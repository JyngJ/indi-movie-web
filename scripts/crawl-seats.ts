/**
 * 좌석 가용 현황 갱신 스크립트 (dtryxReservationApi 소스 대상)
 * 실행: npx tsx --env-file=.env.local scripts/crawl-seats.ts
 * GitHub Actions에서도 동일하게 사용
 */
import { runSeatChecks } from '../src/lib/crawl/run-seat-checks'
import { notifyDiscordSeats } from '../src/lib/crawl/notify-discord'

async function main() {
  console.log(`[${new Date().toISOString()}] 좌석 현황 갱신 시작`)

  const result = await runSeatChecks()

  if (result.runs.length === 0) {
    console.log('좌석 갱신 대상 소스 없음 (dtryxReservationApi 소스가 없거나 비활성)')
    process.exit(0)
  }

  for (const run of result.runs) {
    const icon = run.status === 'completed' ? '✅' : '❌'
    const detail = run.status === 'completed'
      ? `${run.updatedCount}개 좌석 갱신`
      : run.error
    console.log(`${icon} ${run.sourceName}: ${detail}`)
  }

  const failed = result.runs.filter((r) => r.status === 'failed')
  console.log(`\n완료 (${(result.durationMs / 1000).toFixed(1)}s)`)

  // 성공/실패 관계없이 매 실행마다 Discord 리포트 (좌석은 updatedCount 기준)
  await notifyDiscordSeats(result.runs, result.durationMs)

  if (failed.length > 0) process.exit(1)
}

main().catch((err) => {
  console.error('좌석 갱신 중 치명적 오류:', err)
  process.exit(1)
})
