import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { captureEmailMetric, type EmailDeliveryMetric } from './analytics'
import { emailCampaignUrl, readTrackingToken } from './tracking'

interface TrackingRepository {
  getSentDelivery(id: string): Promise<(EmailDeliveryMetric & { revision: string }) | null>
  isActive(userId: string, revision: string): Promise<boolean>
}
export function trackingRepository(): TrackingRepository {
  const db = createSupabaseAdminClient()
  return {
    async getSentDelivery(id) {
      const { data, error } = await db.from('email_notification_deliveries')
        .select('id,user_id,revision,slot,sent_at').eq('id', id).eq('status', 'sent').maybeSingle()
      if (error) throw error
      return data
    },
    async isActive(userId, revision) {
      const { data, error } = await db.from('email_notification_subscriptions').select('user_id')
        .eq('user_id', userId).eq('revision', revision).eq('status', 'active').maybeSingle()
      if (error) throw error
      return !!data
    },
  }
}
/** 저장소·분석 서비스가 고장 나도 유효한 상영 링크는 열린다. */
export async function resolveEmailTracking(token: string, origin: string, repository: () => TrackingRepository = trackingRepository,
  capture = captureEmailMetric): Promise<{ kind: 'open' | 'click'; location?: string } | null> {
  const payload = readTrackingToken(token)
  if (!payload) return null
  let campaign = 'digest'
  try {
    const repo = repository()
    const delivery = await repo.getSentDelivery(payload.id)
    if (delivery) {
      campaign = delivery.slot
      if (await repo.isActive(delivery.user_id, delivery.revision)) await capture(payload.kind === 'open' ? 'opened' : 'clicked', delivery)
    }
  } catch { /* 통계 조회 실패를 예매 탐색 실패로 만들지 않는다. */ }
  return { kind: payload.kind, ...(payload.kind === 'click' ? { location: emailCampaignUrl(origin, payload.path!, campaign) } : {}) }
}
