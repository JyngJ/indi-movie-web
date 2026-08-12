/**
 * 상영시간표 전체 수집 스크립트
 * 실행: npx tsx --env-file=.env.local scripts/crawl-showtimes.ts
 */
import type { CrawlRun } from '../src/types/admin'
import { autoMatchShowtimeCandidates } from '../src/lib/admin/store'
import { runAllSources } from '../src/lib/crawl/run-all-sources'
import { notifyDiscord, notifyDiscordError, notifyDiscordMatch, notifyDiscordStart } from '../src/lib/crawl/notify-discord'
import { buildChangedUrls, submitToIndexNow } from '../src/lib/seo/indexNow'

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

  // 3단계: 자동매칭 — 대량 upsert 직후라 일시적 statement timeout이 날 수 있어 1회 재시도.
  // 두 번 다 실패해도 크롤·upsert는 이미 끝났고 다음 실행에 재매칭되므로 파이프라인을 중단하지 않는다
  // (후속 curate:resolve-pending 단계까지 죽던 문제 방지).
  console.log('\n자동매칭 시작...')
  const matchStart = Date.now()
  try {
    let matchResult
    try {
      matchResult = await autoMatchShowtimeCandidates()
    } catch (e) {
      console.warn(`자동매칭 1차 실패, 10초 후 재시도: ${e instanceof Error ? e.message : String(e)}`)
      await new Promise((r) => setTimeout(r, 10000))
      matchResult = await autoMatchShowtimeCandidates()
    }
    const matchDuration = Date.now() - matchStart
    console.log(`자동매칭 완료: ${matchResult.autoApproved}개 자동승인, ${matchResult.matched}개 매칭, ${matchResult.needsReview}개 검토필요 (${(matchDuration / 1000).toFixed(1)}s)`)
    await notifyDiscordMatch(matchResult.matched, matchResult.autoApproved, matchResult.needsReview, matchDuration)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`자동매칭 실패(스킵, 다음 실행에 재시도): ${msg}`)
    await notifyDiscordError('📽 자동매칭', msg)
  }

  // 4단계: IndexNow 통보 — 상영 시간표는 하루 3번 바뀌는데 사이트맵만으로는 재크롤링이
  // 수 주 늦는다. 바뀐 URL을 Bing 쪽에 직접 밀어넣는다(ChatGPT 검색이 Bing 인덱스를 쓴다).
  // 색인 통보는 부가 작업이라 실패해도 파이프라인을 중단하지 않는다.
  try {
    const urls = await buildChangedUrls()
    const result = await submitToIndexNow(urls)
    console.log(
      result.ok
        ? `\nIndexNow 통보: ${result.submitted}개 URL (HTTP ${result.status})`
        : `\nIndexNow 통보 거부됨 (HTTP ${result.status}) — 키 파일 공개 여부 확인 필요`,
    )
  } catch (e) {
    console.warn(`IndexNow 통보 실패(스킵): ${e instanceof Error ? e.message : String(e)}`)
  }

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
