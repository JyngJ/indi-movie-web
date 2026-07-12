/**
 * GV/이벤트 수집 + 자동매칭 스크립트 — 1~2일에 한 번 크론으로 실행.
 * 실행: npx tsx --env-file=.env.local scripts/crawl-events.ts
 */
import { listEventSources, saveEventCandidates, markEventSourceCrawled, autoMatchEventCandidates } from '../src/lib/admin/event-store'
import { crawlEventCandidates } from '../src/lib/admin/event-crawler'
import { notifyDiscordStart, notifyDiscordError } from '../src/lib/crawl/notify-discord'

async function main() {
  console.log(`[${new Date().toISOString()}] GV/이벤트 수집 시작`)
  await notifyDiscordStart('🎤 GV/이벤트 수집')

  const sources = (await listEventSources()).filter((s) => s.enabled)
  let totalCreated = 0
  let totalSkipped = 0
  const failedSources: string[] = []

  for (const source of sources) {
    try {
      const candidates = await crawlEventCandidates({ source })
      const { created, skipped } = await saveEventCandidates(candidates)
      await markEventSourceCrawled(source.id)
      totalCreated += created
      totalSkipped += skipped
      console.log(`✅ ${source.theaterName}: ${created}개 신규, ${skipped}개 중복`)
    } catch (error) {
      failedSources.push(source.theaterName)
      console.log(`⚠️  ${source.theaterName}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  console.log(`\n총 ${totalCreated}개 신규 후보 수집 (${totalSkipped}개 중복 스킵)`)
  if (failedSources.length) console.log(`수집 실패: ${failedSources.join(', ')}`)

  console.log('\n자동매칭 시작...')
  const matchResult = await autoMatchEventCandidates(null)
  console.log(`자동매칭 완료: ${matchResult.autoApproved}개 자동승인, ${matchResult.needsReview}개 검토필요, 실패 ${matchResult.failed.length}건`)
  if (matchResult.failed.length) {
    for (const f of matchResult.failed) console.log(`  - ${f.candidateId}: ${f.reason}`)
  }
}

main().catch(async (err: unknown) => {
  console.error('GV/이벤트 수집 중 치명적 오류:', err)
  const msg = err instanceof Error ? err.message : String(err)
  await notifyDiscordError('🎤 GV/이벤트 수집', msg)
  process.exit(1)
})
