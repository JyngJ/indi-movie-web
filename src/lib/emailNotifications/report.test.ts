import { afterEach, expect, it, vi } from 'vitest'
import { reportEmailDelivery } from './report'
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })
it('신규 발송이 없으면 재시도 완료 보고를 보내지 않는다', async () => {
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
  await reportEmailDelivery({ sent: 0, failed: 0, unknown: 0 })
  expect(fetcher).not.toHaveBeenCalled()
})
it('성공 인원과 일부 실패를 구분해 기존 report 채널에 알린다', async () => {
  vi.stubEnv('DISCORD_REPORT_WEBHOOK_URL', 'https://example.test/webhook')
  const fetcher = vi.fn().mockResolvedValue({ ok: true }); vi.stubGlobal('fetch', fetcher)
  await reportEmailDelivery({ sent: 8, failed: 1, unknown: 2 }, new Date('2026-10-23T00:00:00Z'))
  const body = JSON.parse(fetcher.mock.calls[0][1].body)
  expect(body.content).toContain('메일 일부 발송 완료 · 8명에게 보냈어요')
  expect(body.content).toContain('발송 실패 1명')
  expect(body.content).toContain('결과 확인 필요 2명')
  expect(body.allowed_mentions).toEqual({ parse: [] })
})
