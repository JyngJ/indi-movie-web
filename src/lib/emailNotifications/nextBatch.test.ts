import { afterEach, beforeEach, expect, it, vi } from 'vitest'
vi.mock('./batch', () => ({ previewNextEmailBatch: vi.fn() }))
import { syncNextBatchPreview } from './nextBatch'
beforeEach(() => {
  vi.stubEnv('EMAIL_ANALYTICS_ENABLED', 'true')
  vi.stubEnv('NEXT_PUBLIC_POSTHOG_TOKEN', 'test-token')
  vi.stubEnv('EMAIL_NOTIFICATION_TOKEN_SECRET', 'a'.repeat(32))
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })
it('다음 발송일과 받을 인원만 개인 식별 없이 보낸다', async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true }); vi.stubGlobal('fetch', fetcher)
  expect(await syncNextBatchPreview(async () => ({ slot: '2026-10-30', considered: 5, ready: 2 }))).toBe(true)
  const body = JSON.parse(fetcher.mock.calls[0][1].body)
  expect(body.event).toBe('email next batch snapshot')
  expect(body.properties).toMatchObject({ next_recipients: 2, active_subscribers: 5, send_date: '2026-10-30', $process_person_profile: false })
  expect(Object.keys(body.properties).sort()).toEqual(['$geoip_disable', '$ip', '$process_person_profile', 'active_subscribers', 'measured_at', 'next_recipients', 'send_date'].sort())
})
it('조회 실패·비정상 값은 0으로 보내지 않는다', async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true }); vi.stubGlobal('fetch', fetcher)
  expect(await syncNextBatchPreview(async () => { throw new Error('offline') })).toBe(false)
  expect(await syncNextBatchPreview(async () => ({ slot: '2026-10-30', considered: 1, ready: -1 }))).toBe(false)
  expect(fetcher).not.toHaveBeenCalled()
})
