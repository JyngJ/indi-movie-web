import { captureEmailAggregate } from './analytics'

export const BATCH_SENT_EVENT = 'email batch sent'
export interface BatchSentResult {
  slot: string | null; considered: number; sent: number; nudged: number; failed: number; unknown: number
}
/**
 * 한 회차에 실제로 보낸 수를 소식 메일·관심 등록 안내로 나눠 PostHog에 남긴다. 메일별
 * `email digest sent`(mail_type)는 받은 사람 단위라 회차 합계를 보려면 다시 세야 해서, 발송 직후 숫자를 그대로 남긴다.
 * 발송일이 아니면(slot 없음) 남기지 않는다.
 */
export async function syncBatchSent(result: BatchSentResult, now = new Date()): Promise<boolean> {
  const { slot, considered, sent, nudged, failed, unknown } = result
  if (!slot || ![considered, sent, nudged, failed, unknown].every(n => Number.isSafeInteger(n) && n >= 0) || nudged > sent) return false
  const sentAt = now.toISOString()
  return captureEmailAggregate(BATCH_SENT_EVENT, 'email-batch', sentAt, {
    send_date: slot, sent_total: sent, sent_digest: sent - nudged, sent_nudge: nudged,
    failed, unknown, active_subscribers: considered, measured_at: sentAt,
  })
}
