import { describe, it, expect } from 'vitest'
import { buildSectionAnalytics, computeRunStartIndexes, shownCount } from './sectionRuns'

const s = (n: number) => ({ movies: Array.from({ length: n }, (_, i) => i) })

describe('shownCount', () => {
  it('빈 섹션은 안 센다', () => {
    expect(shownCount([s(3), s(0), s(1), s(0)])).toBe(2)
  })
})

describe('computeRunStartIndexes', () => {
  it('첫 run은 0에서 시작한다', () => {
    expect(computeRunStartIndexes([[s(1)], [s(1)]])[0]).toBe(0)
  })

  it('앞 run이 그린 수만큼 이어붙인다', () => {
    const top = [s(5)]                 // 1개
    const run1 = [s(5), s(5), s(5)]    // 3개
    const run1b = [s(5), s(5)]         // 2개
    const run2 = [s(5)]
    expect(computeRunStartIndexes([top, run1, run1b, run2])).toEqual([0, 1, 4, 6])
  })

  it('숨은 섹션(빈 배열)은 순번을 차지하지 않는다', () => {
    // 예전 버그: run1.length(=3)를 그대로 startIndex로 써서 숨은 섹션까지 셌다
    const top: { movies: unknown[] }[] = []          // 랭킹 미노출
    const run1 = [s(5), s(0), s(0)]                  // 3개 중 1개만 노출
    const run1b = [s(5)]
    expect(computeRunStartIndexes([top, run1, run1b])).toEqual([0, 0, 1])
  })

  it('전부 비어 있으면 모두 0', () => {
    expect(computeRunStartIndexes([[], [], []])).toEqual([0, 0, 0])
  })

  it('run 하나가 통째로 숨어도 뒤 run의 순번이 안 밀린다', () => {
    const withTop = computeRunStartIndexes([[s(5)], [s(5)], [s(5)]])
    const noTop = computeRunStartIndexes([[], [s(5)], [s(5)]])
    expect(withTop).toEqual([0, 1, 2])
    expect(noTop).toEqual([0, 0, 1])
  })

  it('반환 길이는 입력 run 수와 같다', () => {
    expect(computeRunStartIndexes([[s(1)], [], [s(1)], []])).toHaveLength(4)
  })
})

describe('buildSectionAnalytics', () => {
  const base = { listId: 'realtime_popular_rank', sectionTitle: '지금 가장 많이 찾는 영화', run: 'top', movieCount: 10, compact: false }

  it('섹션 메타를 전부 싣는다', () => {
    expect(buildSectionAnalytics({ ...base, position: 0 })).toEqual({
      source: 'films_tab',
      list_id: 'realtime_popular_rank',
      section_title: '지금 가장 많이 찾는 영화',
      run: 'top',
      position: 0,
      movie_count: 10,
      layout: 'row',
    })
  })

  it('position 0도 싣는다 — falsy라고 빠지면 안 된다', () => {
    expect(buildSectionAnalytics({ ...base, position: 0 })).toHaveProperty('position', 0)
  })

  it('position이 없는 상단 고정 섹션은 키 자체를 빼서 null과 구분되게 한다', () => {
    const out = buildSectionAnalytics({ ...base, run: 'fixed_top' })
    expect('position' in out).toBe(false)
    expect(out.run).toBe('fixed_top')
  })

  it('2편 이하 카드 문법은 layout=card', () => {
    expect(buildSectionAnalytics({ ...base, movieCount: 2, compact: true }).layout).toBe('card')
  })

  it('dwell과 click이 같은 객체를 쓰면 속성이 어긋날 수 없다', () => {
    const a = buildSectionAnalytics({ ...base, position: 3 })
    const clickPayload = { ...a, movie_id: 'x' }
    expect(clickPayload.position).toBe(a.position)
    expect(clickPayload.list_id).toBe(a.list_id)
  })
})
