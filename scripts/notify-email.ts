/** 기본은 조회만. --send와 EMAIL_NOTIFICATION_DELIVERY_ENABLED=true가 모두 있어야 발송한다. */
import { runEmailBatch } from '../src/lib/emailNotifications/batch'
runEmailBatch({ send: process.argv.includes('--send') }).then(result => {
  console.log('[email notifications]', result)
  if (result.failed || result.unknown) process.exitCode = 1
}).catch(() => {
  // 공급자 응답·주소·인증 토큰은 로그에 남기지 않는다.
  console.error('[email notifications] 발송 작업을 완료하지 못했어요')
  process.exitCode = 1
})
