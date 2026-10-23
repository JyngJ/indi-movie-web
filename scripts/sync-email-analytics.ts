/** 메일은 보내지 않는다. 계측을 넣은 발송 성공 기록만 PostHog로 재동기화한다. */
import { createSupabaseAdminClient } from '../src/lib/supabase/admin'
import { captureEmailMetric, emailAnalyticsConfigured } from '../src/lib/emailNotifications/analytics'
import { getSubscription } from '../src/lib/emailNotifications/server'
import { safeErrorSummary } from '../src/lib/emailNotifications/safeError'

async function main() {
  if (!emailAnalyticsConfigured()) throw new Error('analytics_not_configured')
  const db = createSupabaseAdminClient()
  const since = new Date(Date.now() - 30 * 86400000).toISOString()
  let synced = 0, failed = 0
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await db.from('email_notification_deliveries')
      .select('id,user_id,revision,slot,sent_at,message').eq('status', 'sent')
      .gte('sent_at', since).order('id').range(offset, offset + 99)
    if (error) throw error
    for (const delivery of data ?? []) {
      if (!delivery.message?.html?.includes('/api/email-notifications/track?token=')) continue
      const subscription = await getSubscription(delivery.user_id)
      if (subscription?.status !== 'active' || subscription.revision !== delivery.revision) continue
      if (!process.argv.includes('--send')) { synced++; continue }
      if (await captureEmailMetric('sent', delivery)) synced++; else failed++
    }
    if (!data || data.length < 100) break
  }
  console.log('[email analytics]', { dryRun: !process.argv.includes('--send'), synced, failed })
  if (failed) process.exitCode = 1
}
main().catch((error: unknown) => {
  console.error('[email analytics] 통계를 전송하지 못했어요 — 메일은 재발송하지 않아요', safeErrorSummary(error))
  process.exitCode = 1
})
