import { captureEmailAggregate, emailAnalyticsConfigured } from './analytics'
import { previewNextEmailBatch } from './batch'

export const NEXT_BATCH_EVENT = 'email next batch snapshot'
export interface NextBatchPreview { slot: string; considered: number; ready: number }
/**
 * 다음 발송일에 메일을 받을 인원을 PostHog에 남긴다. 수신 중이어도 보낼 소식이 없으면
 * 발송에서 빠지므로 수신 등록 인원과 다르다. 지금까지 쌓인 소식 기준이라 발송 전에 늘 수 있다.
 * 조회 실패를 0명으로 보내지 않는다.
 */
export async function syncNextBatchPreview(preview: () => Promise<NextBatchPreview> = previewNextEmailBatch): Promise<boolean> {
  if (!emailAnalyticsConfigured()) return false
  try {
    const startedAt = new Date().toISOString()
    const { slot, considered, ready } = await preview()
    if (![considered, ready].every(n => Number.isSafeInteger(n) && n >= 0)) return false
    return await captureEmailAggregate(NEXT_BATCH_EVENT, 'email-next-batch', startedAt,
      { next_recipients: ready, active_subscribers: considered, slot, measured_at: startedAt })
  } catch { return false }
}
