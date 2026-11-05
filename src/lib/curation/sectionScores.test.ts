import { expect, it } from 'vitest'
import { computeSectionScores } from './sectionScores'
import { orderSections, sectionWeight } from './sectionOrder'

it('위 자리라서 많이 눌린 섹션보다 아래 자리인데 잘 눌린 섹션이 점수가 높다', () => {
  const stats = [
    // 0번 자리: 평균 20%
    { listId: 'top', position: 0, impressions: 1000, clicks: 200 },
    { listId: 'other0', position: 0, impressions: 1000, clicks: 200 },
    // 8번 자리: 평균 4%인데 deep은 10%
    { listId: 'deep', position: 8, impressions: 300, clicks: 30 },
    { listId: 'other8', position: 8, impressions: 1000, clicks: 30 },
  ]
  const scores = new Map(computeSectionScores(stats).map(s => [s.listId, s.score]))
  expect(scores.get('deep')!).toBeGreaterThan(scores.get('top')!)
  expect(scores.get('top')!).toBeCloseTo(1, 1)
})
it('노출이 적으면 평균(1) 쪽으로 당긴다', () => {
  const stats = [
    { listId: 'base', position: 0, impressions: 1000, clicks: 100 },
    { listId: 'tiny', position: 0, impressions: 5, clicks: 3 },
  ]
  const tiny = computeSectionScores(stats).find(s => s.listId === 'tiny')!
  expect(tiny.score).toBeLessThan(3 / 5 / 0.1)
  expect(tiny.score).toBeGreaterThan(1)
})
it('상영작이 적은 섹션은 내리고, 점수가 없으면 원래 순서를 지킨다', () => {
  const s = (listId: string, n: number) => ({ listId, movies: Array(n).fill(0) })
  expect(sectionWeight(2, 2)).toBeCloseTo(1)
  const ordered = orderSections([s('a', 10), s('b', 10), s('c', 10)], new Map([['c', 1.5]]))
  expect(ordered.map(x => x.listId)).toEqual(['c', 'a', 'b'])
  expect(orderSections([s('a', 10), s('b', 10)], null).map(x => x.listId)).toEqual(['a', 'b'])
  // 불러오는 중인 섹션은 꽉 찬 것으로 보고 점수로 자리를 잡는다
  expect(orderSections([s('a', 10), { ...s('b', 0), loading: true }], new Map([['b', 5]])).map(x => x.listId)).toEqual(['b', 'a'])
})
