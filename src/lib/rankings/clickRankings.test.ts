import { describe, expect, it } from 'vitest'
import { isSnapshotFresh, isSnapshotUsableAsFallback, parseSnapshot, toRanking } from './clickRankings'

const MOVIE = '0b9f5c8e-1d2a-4c3b-9e8f-7a6b5c4d3e2f'
const NOW = new Date('2026-11-25T03:00:00.000Z')

describe('toRanking', () => {
  it('UUID가 아닌 movie_id 행은 버린다', () => {
    expect(toRanking([[MOVIE, 12], ['festival/abc', 3], [null, 1]])).toEqual([{ movieId: MOVIE, count: 12 }])
  })
})

describe('스냅샷 신선도', () => {
  const at = (h: number) => ({ booking: [], views: [], computedAt: new Date(NOW.getTime() - h * 3600_000).toISOString() })
  it('3시간 미만이면 그대로 쓴다', () => {
    expect(isSnapshotFresh(at(2.9), NOW)).toBe(true)
    expect(isSnapshotFresh(at(3), NOW)).toBe(false)
    expect(isSnapshotFresh(null, NOW)).toBe(false)
  })
  it('폴백은 7일 미만까지', () => {
    expect(isSnapshotUsableAsFallback(at(24 * 6.9), NOW)).toBe(true)
    expect(isSnapshotUsableAsFallback(at(24 * 7), NOW)).toBe(false)
  })
  it('미래 시각이 찍힌 스냅샷(시계 어긋남)은 믿지 않는다', () => {
    expect(isSnapshotFresh(at(-1), NOW)).toBe(false)
  })
})

describe('parseSnapshot', () => {
  it('저장된 행을 읽고 손상된 항목은 거른다', () => {
    expect(parseSnapshot({
      booking: [{ movieId: MOVIE, count: 3 }, { movieId: 'x', count: 1 }, null],
      views: [{ movieId: MOVIE, count: '7' }],
      computed_at: '2026-11-25T02:00:00Z',
    })).toEqual({ booking: [{ movieId: MOVIE, count: 3 }], views: [{ movieId: MOVIE, count: 7 }], computedAt: '2026-11-25T02:00:00Z' })
  })
  it('모양이 틀리면 null', () => {
    expect(parseSnapshot(null)).toBeNull()
    expect(parseSnapshot({ booking: [], views: 'x', computed_at: 'now' })).toBeNull()
    expect(parseSnapshot({ booking: [], views: [] })).toBeNull()
  })
})
