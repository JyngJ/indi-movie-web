import { describe, it, expect } from 'vitest'
import { mergePopularRanking, BOOKING_WEIGHT } from './popularRanking'

const all = () => true

describe('mergePopularRanking', () => {
  it('예매에 가중치를 주고 조회와 합산한다', () => {
    const out = mergePopularRanking(
      [{ movieId: 'a', count: 3 }],
      [{ movieId: 'a', count: 4 }],
      all,
    )
    expect(out).toEqual([{ movieId: 'a', score: 3 * BOOKING_WEIGHT + 4 }])
  })

  it('한쪽에만 있는 영화도 후보에 넣는다', () => {
    const out = mergePopularRanking(
      [{ movieId: 'booking-only', count: 5 }],
      [{ movieId: 'views-only', count: 5 }],
      all,
    )
    expect(out.map((x) => x.movieId)).toEqual(['booking-only', 'views-only'])
    expect(out[0].score).toBe(10)
    expect(out[1].score).toBe(5)
  })

  it('예매 신호가 조회 신호보다 무겁다', () => {
    // 예매 4 · 조회 0  vs  예매 0 · 조회 7 — 가중치 2면 8 대 7로 예매가 이긴다
    const out = mergePopularRanking(
      [{ movieId: 'booked', count: 4 }],
      [{ movieId: 'viewed', count: 7 }],
      all,
    )
    expect(out[0].movieId).toBe('booked')
  })

  it('상영 중이 아닌 영화는 제외한다', () => {
    const out = mergePopularRanking(
      [{ movieId: 'ended', count: 99 }, { movieId: 'active', count: 1 }],
      [{ movieId: 'ended', count: 99 }],
      (id) => id === 'active',
    )
    expect(out).toEqual([{ movieId: 'active', score: 2 }])
  })

  it('동점은 movieId 순으로 고정한다 — 리렌더마다 순서가 뒤집히면 안 된다', () => {
    const entries = [{ movieId: 'b', count: 1 }, { movieId: 'a', count: 1 }]
    const first = mergePopularRanking(entries, [], all)
    const second = mergePopularRanking([...entries].reverse(), [], all)
    expect(first.map((x) => x.movieId)).toEqual(['a', 'b'])
    expect(second.map((x) => x.movieId)).toEqual(['a', 'b'])
  })

  it('limit로 자른다', () => {
    const entries = Array.from({ length: 20 }, (_, i) => ({ movieId: `m${i}`, count: 20 - i }))
    expect(mergePopularRanking(entries, [], all)).toHaveLength(10)
    expect(mergePopularRanking(entries, [], all, 3)).toHaveLength(3)
  })

  it('입력이 없으면 빈 배열', () => {
    expect(mergePopularRanking(undefined, undefined, all)).toEqual([])
  })
})
