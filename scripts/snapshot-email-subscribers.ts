/** 메일을 보내지 않고 현재 수신 중인 회원 수만 PostHog에 저장한다. */
import { countEmailSubscribers, syncEmailSubscriberCount } from '../src/lib/emailNotifications/subscriberCount'
import { safeErrorSummary } from '../src/lib/emailNotifications/safeError'
async function main() {
  if (!process.argv.includes('--send')) {
    console.log('[email subscribers]', { active_subscribers: await countEmailSubscribers(), dryRun: true })
    return
  }
  if (!await syncEmailSubscriberCount()) throw new Error('Snapshot failed')
  console.log('[email subscribers] 현재 수신자 수를 저장했어요')
}
main().catch((error: unknown) => {
  console.error('[email subscribers] 현재 수신자 수를 저장하지 못했어요', safeErrorSummary(error))
  process.exitCode = 1
})
