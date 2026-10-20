import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { signTrackingToken } from './tracking'
const { jobs, record } = vi.hoisted(() => ({ jobs: [] as (() => Promise<void>)[], record: vi.fn() }))
vi.mock('next/server', () => ({ after: (job: () => Promise<void>) => jobs.push(job) }))
vi.mock('./trackingServer', () => ({ resolveEmailTracking: record }))
import { GET, HEAD } from '@/app/api/email-notifications/track/route'
beforeEach(() => {
  jobs.length = 0; record.mockReset()
  vi.stubEnv('EMAIL_NOTIFICATION_TOKEN_SECRET', 'test-secret-'.repeat(4))
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://movie.test')
})
afterEach(() => vi.unstubAllEnvs())
it('추적 요청을 기다리지 않고 이동하며 수신자 토큰을 목적지·쿠키에 남기지 않는다', async () => {
  const token = signTrackingToken({ v: 1, id: '59229738-0719-4874-b578-f646c86fd7c5', kind: 'click', path: '/movie/one?tab=theaters', campaign: '2026-10-23', expires: Date.now() + 10000 })
  const response = await GET(new Request('https://movie.test/api/email-notifications/track?token=' + token))
  expect(response.status).toBe(302)
  expect(response.headers.get('location')).toContain('utm_campaign=2026-10-23')
  expect(response.headers.get('location')).not.toContain(token)
  expect(response.headers.get('set-cookie')).toContain('Max-Age=1800')
  expect(response.headers.get('set-cookie')).not.toContain(token)
  expect(response.headers.get('referrer-policy')).toBe('no-referrer')
  expect(record).not.toHaveBeenCalled()
  await jobs[0]()
  expect(record).toHaveBeenCalled()
})
it('위조 요청·HEAD는 통계로 세지 않는다', async () => {
  expect((await GET(new Request('https://movie.test/api/email-notifications/track?token=bad'))).status).toBe(404)
  await HEAD()
  expect(jobs).toHaveLength(0)
})
it('열람 이미지의 응답은 캐시하지 않는다', async () => {
  const token = signTrackingToken({ v: 1, id: '59229738-0719-4874-b578-f646c86fd7c5', kind: 'open', expires: Date.now() + 10000 })
  const response = await GET(new Request('https://movie.test/api/email-notifications/track?token=' + token))
  expect(response.headers.get('content-type')).toBe('image/gif')
  expect(response.headers.get('cache-control')).toContain('no-store')
  expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0)
})
