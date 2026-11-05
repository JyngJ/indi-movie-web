import { expect, it } from 'vitest'
import { easeNeighbors, invertSpd, trainEase } from './ease'
import type { Interaction } from './types'

it('대칭 양의 정부호 행렬의 역행렬을 구한다', () => {
  const A = Float64Array.from([4, 2, 0, 2, 5, 1, 0, 1, 3])
  const inv = invertSpd(A, 3)
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    let s = 0
    for (let k = 0; k < 3; k++) s += A[i * 3 + k] * inv[k * 3 + j]
    expect(s).toBeCloseTo(i === j ? 1 : 0, 10)
  }
})

const rows = (pairs: Array<[string, string]>): Interaction[] => pairs.map(([user, movieId]) => ({ user, movieId, weight: 1, at: '2026-11-01T00:00:00Z' }))
it('함께 본 영화끼리 양의 점수를 주고 함께 보지 않은 영화엔 주지 않는다', () => {
  const data = rows([['u1', 'a'], ['u1', 'b'], ['u2', 'a'], ['u2', 'b'], ['u3', 'a'], ['u3', 'b'], ['u4', 'c'], ['u4', 'd'], ['u5', 'c'], ['u5', 'd']])
  const table = easeNeighbors(trainEase(data, { lambda: 1 }), 5)
  expect(table.get('a')?.[0].movieId).toBe('b')
  expect(table.get('a')?.some(n => n.movieId === 'c')).toBe(false)
  expect(table.get('c')?.[0].movieId).toBe('d')
})
it('본 사람이 적은 영화는 행렬에서 뺀다', () => {
  const model = trainEase(rows([['u1', 'a'], ['u2', 'a'], ['u1', 'solo']]), { lambda: 1, minUsersPerItem: 2 })
  expect(model.items).toEqual(['a'])
})
it('함께 본 사람이 기준보다 적은 이웃은 뺀다', async () => {
  const { filterBySupport } = await import('./ease')
  const data = rows([['u1', 'a'], ['u1', 'b'], ['u2', 'a'], ['u2', 'b'], ['u3', 'a'], ['u3', 'c']])
  const table = new Map([['a', [{ movieId: 'b', score: 1 }, { movieId: 'c', score: 1 }]]])
  expect(filterBySupport(table, data, 2).get('a')?.map(n => n.movieId)).toEqual(['b'])
})
