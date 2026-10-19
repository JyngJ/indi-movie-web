/** 반송·스팸 신고를 확인한 주소의 발송을 중단한다. 주소는 로그에 출력하지 않는다. */
import { randomUUID } from 'node:crypto'
import { createSupabaseAdminClient } from '../src/lib/supabase/admin'
import { normalizeEmail } from '../src/lib/emailNotifications/domain'
async function main() {
  const email = normalizeEmail(process.env.SUPPRESS_EMAIL_ADDRESS)
  if (!email) throw new Error('Set SUPPRESS_EMAIL_ADDRESS')
  const { data, error } = await createSupabaseAdminClient().from('email_notification_subscriptions')
    .update({ status: 'suppressed', revision: randomUUID(), verification_hash: null, verification_expires_at: null, revoked_at: new Date().toISOString() })
    .eq('email', email).select('user_id')
  if (error) throw new Error('Suppression failed')
  console.log('발송 중단 계정 수:', data.length)
}
main().catch(() => { console.error('발송 중단을 완료하지 못했어요'); process.exitCode = 1 })
