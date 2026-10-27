/** 메일을 보내지 않고 다음 발송일에 받을 인원만 PostHog에 저장한다. --send가 없으면 조회만 한다. */
import { previewNextEmailBatch } from '../src/lib/emailNotifications/batch'
import { syncNextBatchPreview } from '../src/lib/emailNotifications/nextBatch'
import { safeErrorSummary } from '../src/lib/emailNotifications/safeError'
async function main() {
  if (!process.argv.includes('--send')) {
    console.log('[email next batch]', { ...await previewNextEmailBatch(), dryRun: true })
    return
  }
  if (!await syncNextBatchPreview()) throw new Error('Snapshot failed')
  console.log('[email next batch] 다음 발송 대상자 수를 저장했어요')
}
main().catch((error: unknown) => {
  console.error('[email next batch] 다음 발송 대상자 수를 저장하지 못했어요', safeErrorSummary(error))
  process.exitCode = 1
})
