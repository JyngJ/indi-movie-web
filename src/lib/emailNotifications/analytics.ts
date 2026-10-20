import { createHmac } from 'node:crypto'

export type EmailMetric = 'sent' | 'opened' | 'clicked'
export interface EmailDeliveryMetric {
  id: string; user_id: string; slot: string; sent_at: string
}
export function emailAnalyticsConfigured(): boolean {
  return (process.env.EMAIL_ANALYTICS_ENABLED === 'true'
    || (process.env.EMAIL_ANALYTICS_ENABLED !== 'false' && process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV !== 'preview'))
    && !!process.env.NEXT_PUBLIC_POSTHOG_TOKEN
    && (process.env.EMAIL_NOTIFICATION_TOKEN_SECRET?.length ?? 0) >= 32
}
/** 통계 실패가 발송 상태를 바꾸지 않는다. 재동기화는 delivery_id 고유 집계로 중복을 제거한다. */
export async function captureEmailMetric(kind: EmailMetric, delivery: EmailDeliveryMetric): Promise<boolean> {
  if (!emailAnalyticsConfigured()) return false
  try {
    const host = new URL(process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com')
    if (host.protocol !== 'https:') return false
    // 웹 계정 식별자·주소를 분석 서비스로 보내지 않는 이메일 전용 가명 식별자.
    const recipient = createHmac('sha256', process.env.EMAIL_NOTIFICATION_TOKEN_SECRET!)
      .update(`email-analytics:${delivery.user_id}`).digest('hex')
    const response = await fetch(new URL('/i/v0/e/', host), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(3000),
      body: JSON.stringify({ api_key: process.env.NEXT_PUBLIC_POSTHOG_TOKEN,
        distinct_id: `email:${recipient}`, event: `email digest ${kind}`,
        // 같은 발송분의 분자·분모가 함께 움직이도록 발송일 기준으로 묶는다.
        timestamp: delivery.sent_at,
        properties: { delivery_id: delivery.id, campaign: delivery.slot, mail_type: 'digest',
          observed_at: new Date().toISOString(), sent_at: delivery.sent_at,
          $process_person_profile: false, $geoip_disable: true, $ip: '0.0.0.0' },
      }),
    })
    return response.ok
  } catch { return false }
}
