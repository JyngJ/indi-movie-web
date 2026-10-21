import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { emailAnalyticsConfigured } from './analytics'

export const SUBSCRIBER_COUNT_EVENT = 'email subscribers snapshot'
/** 주소를 조회하지 않고 인증 완료·수신 중인 회원 수만 센다. */
export async function countEmailSubscribers(): Promise<number> {
  const { count, error } = await createSupabaseAdminClient().from('email_notification_subscriptions')
    .select('user_id', { count: 'exact', head: true }).eq('status', 'active')
    .not('email', 'is', null).not('subscribed_at', 'is', null)
  if (error || count === null) throw new Error('Subscriber count unavailable')
  return count
}
/** 통계 장애가 인증·해지 성공을 바꾸지 않는다. 조회 실패를 0명으로 보내지 않는다. */
export async function syncEmailSubscriberCount(countSubscribers = countEmailSubscribers): Promise<boolean> {
  if (!emailAnalyticsConfigured()) return false
  try {
    const startedAt = new Date().toISOString()
    const count = await countSubscribers()
    if (!Number.isSafeInteger(count) || count < 0) return false
    const host = new URL(process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com')
    if (host.protocol !== 'https:') return false
    const response = await fetch(new URL('/i/v0/e/', host), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(3000),
      body: JSON.stringify({ api_key: process.env.NEXT_PUBLIC_POSTHOG_TOKEN,
        event: SUBSCRIBER_COUNT_EVENT, distinct_id: 'email-subscriber-count',
        // 병렬 요청이 늦게 도착해도 나중에 시작한 전체 조회가 최신값이 된다.
        timestamp: startedAt,
        properties: { active_subscribers: count, measured_at: startedAt,
          $process_person_profile: false, $geoip_disable: true, $ip: '0.0.0.0' },
      }),
    })
    return response.ok
  } catch { return false }
}
