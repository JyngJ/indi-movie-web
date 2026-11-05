import { expect, it } from 'vitest'
import { recommend } from './recommend'
import { ndcgAt, recallAt } from './metrics'
import type { MovieFeatures, NeighborTable } from './types'

const now = new Date('2026-11-05T00:00:00Z')
const neighbors: NeighborTable = new Map([['seen', [{ movieId: 'x', score: 0.5 }, { movieId: 'y', score: 0.2 }, { movieId: 'gone', score: 0.9 }]]])
it('상영 중인 영화만, 본 영화는 빼고, 점수순으로 근거와 함께 돌려준다', () => {
  const out = recommend({ history: [{ movieId: 'seen', weight: 1, at: now.toISOString() }], candidates: ['x', 'y', 'seen'], neighbors, now, contentWeight: 0 })
  expect(out.map(r => r.movieId)).toEqual(['x', 'y'])
  expect(out[0].because).toBe('seen')
})
it('행동 이웃이 없는 신작은 감독이 같으면 콘텐츠 점수로 올라온다', () => {
  const f = (id: string, directors: string[]): MovieFeatures => ({ id, directors, genres: ['드라마'], nation: '한국', year: 2026 })
  const features = new Map([['seen', f('seen', ['홍상수'])], ['new', f('new', ['홍상수'])], ['other', f('other', ['다른 감독'])]])
  const out = recommend({ history: [{ movieId: 'seen', weight: 1, at: now.toISOString() }], candidates: ['new', 'other'], neighbors: new Map(), features, now })
  expect(out[0].movieId).toBe('new')
})
it('recall·ndcg', () => {
  expect(recallAt(['a', 'b', 'c'], new Set(['b']), 2)).toBe(1)
  expect(ndcgAt(['a', 'b'], new Set(['b']), 2)).toBeCloseTo(1 / Math.log2(3))
})
