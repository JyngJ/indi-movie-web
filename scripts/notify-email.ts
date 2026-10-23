/** 기본은 조회만. --send와 EMAIL_NOTIFICATION_DELIVERY_ENABLED=true가 모두 있어야 발송한다. */
import { reportEmailDelivery } from '../src/lib/emailNotifications/report'
import { runEmailBatch } from '../src/lib/emailNotifications/batch'
import { safeErrorSummary } from '../src/lib/emailNotifications/safeError'
runEmailBatch({ send: process.argv.includes('--send') }).then(async result => {
  console.log('[email notifications]', result)
  try { await reportEmailDelivery(result) }
  catch { console.error('[email notifications] 발송 결과를 report 채널에 보내지 못했어요'); process.exitCode = 1 }
  if (result.failed || result.unknown) process.exitCode = 1
}).catch((error: unknown) => {
  // 공급자 응답·주소·인증 토큰은 로그에 남기지 않는다 — 원인 판별에 필요한 코드·메시지만(safeErrorSummary).
  console.error('[email notifications] 발송 작업을 완료하지 못했어요', safeErrorSummary(error))
  process.exitCode = 1
})
