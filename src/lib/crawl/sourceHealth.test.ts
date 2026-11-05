import { describe, expect, it } from 'vitest'
import { findStaleSources, formatStaleFinding, type SourceHealthInput } from './sourceHealth'

const now = new Date('2026-11-03T00:00:00Z')
const day = (n: number) => new Date(now.getTime() - n * 86400000).toISOString()
const run = (n: number, createdCount: number, status = 'completed') => ({ startedAt: day(n), createdCount, status })

const src = (over: Partial<SourceHealthInput>): SourceHealthInput => ({
  sourceId: 's', sourceName: '극장', parser: 'dtryxReservationApi', theaterId: 't', runs: [], ...over,
})

describe('findStaleSources', () => {
  it('자동 수집처가 3회 연속 0건이고 극장에 예정 상영이 없으면 알린다', () => {
    const f = findStaleSources([src({ runs: [run(0, 0), run(1, 0), run(2, 0, 'failed'), run(5, 40)] })], new Map(), now)
    expect(f).toEqual([{ sourceId: 's', sourceName: '극장', kind: 'zero-streak', daysSinceLastHit: 5 }])
  })

  it('극장에 예정 상영이 남아 있으면 알리지 않는다', () => {
    const s = src({ runs: [run(0, 0), run(1, 0), run(2, 0)] })
    expect(findStaleSources([s], new Map([['t', 12]]), now)).toEqual([])
  })

  it('0건이 2회뿐이거나 중간에 수집이 있으면 알리지 않는다', () => {
    expect(findStaleSources([src({ runs: [run(0, 0), run(1, 0)] })], new Map(), now)).toEqual([])
    expect(findStaleSources([src({ runs: [run(0, 0), run(1, 30), run(2, 0)] })], new Map(), now)).toEqual([])
  })

  it('수동(OCR) 수집처는 마지막 업로드가 7일 넘으면 알린다 — 동리시네마', () => {
    const manual = src({ sourceName: '동리시네마', parser: 'ocr', runs: [run(0, 0), run(1, 0), run(130, 49)] })
    expect(findStaleSources([manual], new Map(), now)[0]).toMatchObject({ kind: 'manual-stale', daysSinceLastHit: 130 })
    const fresh = src({ parser: 'ocr', runs: [run(0, 0), run(3, 49)] })
    expect(findStaleSources([fresh], new Map(), now)).toEqual([])
  })

  it('검수 대기 회차만 쌓여 극장 페이지가 비면 알린다 — tinyticket 0.85', () => {
    const stuck = src({ sourceName: '대전아트시네마', parser: 'tinyticketEventManager', runs: [run(0, 3), run(1, 5), run(2, 2)], pendingReviewUpcoming: 35 })
    const [f] = findStaleSources([stuck], new Map(), now)
    expect(f).toMatchObject({ kind: 'pending-review', pendingCount: 35 })
    expect(formatStaleFinding(f)).toContain('35건이 검수 대기')
    expect(findStaleSources([stuck], new Map([['t', 4]]), now)).toEqual([])
  })

  it('극장 id가 없으면 판정하지 않는다', () => {
    expect(findStaleSources([src({ theaterId: null, runs: [run(0, 0), run(1, 0), run(2, 0)] })], new Map(), now)).toEqual([])
  })

  it('오래 멈춘 순으로, 기록이 없으면 맨 앞', () => {
    const f = findStaleSources([
      src({ sourceId: 'a', runs: [run(0, 0), run(1, 0), run(2, 0), run(4, 1)] }),
      src({ sourceId: 'b', runs: [run(0, 0), run(1, 0), run(2, 0)] }),
    ], new Map(), now)
    expect(f.map((x) => x.sourceId)).toEqual(['b', 'a'])
    expect(formatStaleFinding(f[0])).toContain('기록 없음')
  })
})
