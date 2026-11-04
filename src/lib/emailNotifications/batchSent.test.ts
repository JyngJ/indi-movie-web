import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { syncBatchSent } from './batchSent'
beforeEach(() => {
  vi.stubEnv('EMAIL_ANALYTICS_ENABLED', 'true')
  vi.stubEnv('NEXT_PUBLIC_POSTHOG_TOKEN', 'test-token')
  vi.stubEnv('EMAIL_NOTIFICATION_TOKEN_SECRET', 'a'.repeat(32))
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })
const base = { slot: '2026-11-06', considered: 10, sent: 7, nudged: 3, failed: 1, unknown: 0 }
it('회차 발송 수를 소식 메일·관심 등록 안내로 나눠 개인 식별 없이 보낸다', async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true }); vi.stubGlobal('fetch', fetcher)
  expect(await syncBatchSent(base, new Date('2026-11-06T00:05:00Z'))).toBe(true)
  const body = JSON.parse(fetcher.mock.calls[0][1].body)
  expect(body.event).toBe('email batch sent')
  expect(body.distinct_id).toBe('email-batch')
  expect(body.properties).toMatchObject({ send_date: '2026-11-06', sent_total: 7, sent_digest: 4, sent_nudge: 3, failed: 1, unknown: 0, active_subscribers: 10, $process_person_profile: false })
  expect(Object.keys(body.properties).sort()).toEqual(['$geoip_disable', '$ip', '$process_person_profile', 'active_subscribers', 'failed', 'measured_at', 'send_date', 'sent_digest', 'sent_nudge', 'sent_total', 'unknown'].sort())
})
it('발송일이 아니거나 값이 어긋나면 보내지 않는다', async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true }); vi.stubGlobal('fetch', fetcher)
  expect(await syncBatchSent({ ...base, slot: null })).toBe(false)
  expect(await syncBatchSent({ ...base, nudged: 8 })).toBe(false)
  expect(await syncBatchSent({ ...base, sent: -1 })).toBe(false)
  expect(fetcher).not.toHaveBeenCalled()
})
