import { describe, expect, it, vi } from 'vitest'
import { CLICK_RANKINGS_CACHE, type ClickRankingsSnapshot } from './clickRankings'
import { loadClickRankings, type ClickRankingsPorts } from './loadClickRankings'

const NOW = new Date('2026-11-25T03:00:00.000Z') // 12:00 KST
const MOVIE = '0b9f5c8e-1d2a-4c3b-9e8f-7a6b5c4d3e2f'
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600_000).toISOString()
const snapshot = (computedAt: string): ClickRankingsSnapshot => ({
  booking: [{ movieId: MOVIE, count: 9 }],
  views: [{ movieId: MOVIE, count: 30 }],
  computedAt,
})
const LIVE = { booking: [{ movieId: MOVIE, count: 10 }], views: [{ movieId: MOVIE, count: 31 }] }

function ports(over: Partial<ClickRankingsPorts>): ClickRankingsPorts {
  return {
    readSnapshot: async () => null,
    queryLive: async () => LIVE,
    writeSnapshot: async () => {},
    now: () => NOW,
    ...over,
  }
}

/** 2026-11-25 query_log와 같은 실패: PostHog가 TIMEOUT_EXCEEDED를 주거나, 우리 쪽 4.5초 제한이 먼저 끊는다 */
const postHogTimeout = async () => {
  throw new DOMException('The operation was aborted due to timeout', 'TimeoutError')
}

describe('loadClickRankings', () => {
  it('스냅샷이 3시간보다 젊으면 PostHog를 부르지 않는다', async () => {
    const queryLive = vi.fn(async () => LIVE)
    const result = await loadClickRankings(ports({ readSnapshot: async () => snapshot(hoursAgo(1)), queryLive }))
    expect(queryLive).not.toHaveBeenCalled()
    expect(result).toMatchObject({ status: 200, source: 'snapshot', cacheControl: CLICK_RANKINGS_CACHE.ok })
  })

  it('스냅샷이 낡았으면 실시간 집계를 내고, 응답 뒤에 스냅샷으로 남긴다', async () => {
    const writeSnapshot = vi.fn(async () => {})
    const result = await loadClickRankings(ports({ readSnapshot: async () => snapshot(hoursAgo(5)), writeSnapshot }))
    expect(result).toMatchObject({ status: 200, source: 'live', body: { ...LIVE, computedAt: NOW.toISOString() } })
    expect(writeSnapshot).not.toHaveBeenCalled() // 응답 전에는 쓰지 않는다
    if (result.status !== 200) throw new Error('unreachable')
    await result.persist?.()
    expect(writeSnapshot).toHaveBeenCalledWith({ ...LIVE, computedAt: NOW.toISOString() })
  })

  it('PostHog가 실패하면 낡은 스냅샷(7일 이내)을 짧은 캐시로 내준다', async () => {
    const result = await loadClickRankings(ports({ readSnapshot: async () => snapshot(hoursAgo(30)), queryLive: postHogTimeout }))
    expect(result).toMatchObject({ status: 200, source: 'stale-snapshot', cacheControl: CLICK_RANKINGS_CACHE.stale })
    if (result.status !== 200) throw new Error('unreachable')
    expect(result.persist).toBeUndefined() // 낡은 값을 새 값처럼 다시 쓰지 않는다
  })

  it('PostHog가 실패하고 쓸 스냅샷이 없으면 503 + no-store — 빈 배열 200을 캐시하지 않는다', async () => {
    const result = await loadClickRankings(ports({ queryLive: postHogTimeout }))
    expect(result).toMatchObject({ status: 503, cacheControl: 'no-store' })
    expect(result.status === 503 && result.reason).toContain('TimeoutError')
  })

  it('7일보다 낡은 스냅샷은 폴백으로도 쓰지 않는다', async () => {
    const result = await loadClickRankings(ports({ readSnapshot: async () => snapshot(hoursAgo(24 * 8)), queryLive: postHogTimeout }))
    expect(result.status).toBe(503)
  })

  it('실패 경로 어디에서도 캐시되는 빈 랭킹을 만들지 않는다', async () => {
    for (const read of [async () => null, async () => snapshot(hoursAgo(24 * 30))]) {
      const result = await loadClickRankings(ports({ readSnapshot: read, queryLive: postHogTimeout }))
      expect(result.cacheControl).toBe('no-store')
    }
  })
})
