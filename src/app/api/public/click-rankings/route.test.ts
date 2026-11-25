import { beforeEach, describe, expect, it, vi } from 'vitest'

const MOVIE = '0b9f5c8e-1d2a-4c3b-9e8f-7a6b5c4d3e2f'
const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  live: vi.fn(),
  write: vi.fn(),
  after: vi.fn(),
}))

vi.mock('next/server', () => ({ after: mocks.after }))
vi.mock('@/lib/rankings/clickRankingsStore', () => ({
  readClickRankingsSnapshot: mocks.read,
  writeClickRankingsSnapshot: mocks.write,
}))
vi.mock('@/lib/rankings/posthogClickRankings', () => ({ queryClickRankingsFromPostHog: mocks.live }))

import { GET, maxDuration } from './route'

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('GET /api/public/click-rankings', () => {
  it('제한 시간을 명시한다', () => {
    expect(maxDuration).toBeLessThanOrEqual(10)
  })

  it('PostHog 실패 + 스냅샷 없음 → 503 no-store (빈 배열 200 + s-maxage 금지)', async () => {
    mocks.read.mockResolvedValue(null)
    mocks.live.mockRejectedValue(new DOMException('timeout', 'TimeoutError'))
    const res = await GET()
    expect(res.status).toBe(503)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(await res.json()).not.toHaveProperty('booking')
    expect(mocks.after).not.toHaveBeenCalled()
  })

  it('실시간 집계 성공 → 200 캐시 + 응답 뒤 스냅샷 저장 예약', async () => {
    mocks.read.mockResolvedValue(null)
    mocks.live.mockResolvedValue({ booking: [{ movieId: MOVIE, count: 4 }], views: [] })
    mocks.write.mockResolvedValue(undefined)
    const res = await GET()
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toContain('s-maxage=1800')
    expect(res.headers.get('x-click-rankings-source')).toBe('live')
    expect((await res.json()).booking).toEqual([{ movieId: MOVIE, count: 4 }])
    expect(mocks.after).toHaveBeenCalledTimes(1)
    await mocks.after.mock.calls[0][0]()
    expect(mocks.write).toHaveBeenCalledTimes(1)
  })

  it('스냅샷 저장이 실패해도(시드 미적용) 응답 뒤 작업이 던지지 않는다', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    mocks.read.mockResolvedValue(null)
    mocks.live.mockResolvedValue({ booking: [], views: [] })
    mocks.write.mockRejectedValue(new Error('relation "click_rankings" does not exist'))
    await GET()
    await expect(mocks.after.mock.calls[0][0]()).resolves.toBeUndefined()
  })
})
