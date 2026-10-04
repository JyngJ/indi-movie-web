import { describe, expect, it } from 'vitest'
import { buildSeatUpdateBatches } from './seatUpdateBatches'

const r = (fingerprint: string, seatAvailable: number, seatTotal: number) => ({ fingerprint, seatAvailable, seatTotal })

describe('buildSeatUpdateBatches', () => {
  it('같은 좌석 값끼리 한 묶음으로 모은다', () => {
    const batches = buildSeatUpdateBatches(
      [r('a', 10, 100), r('b', 10, 100), r('c', 0, 80)],
      new Set(['a', 'b', 'c']),
    )
    expect(batches).toEqual([
      { seatAvailable: 10, seatTotal: 100, fingerprints: ['a', 'b'] },
      { seatAvailable: 0, seatTotal: 80, fingerprints: ['c'] },
    ])
  })

  it('DB에 없는 fingerprint는 뺀다', () => {
    const batches = buildSeatUpdateBatches([r('a', 1, 2), r('ghost', 1, 2)], new Set(['a']))
    expect(batches).toEqual([{ seatAvailable: 1, seatTotal: 2, fingerprints: ['a'] }])
  })

  it('같은 fingerprint가 중복되면 마지막 값만 쓴다', () => {
    const batches = buildSeatUpdateBatches([r('a', 5, 10), r('a', 3, 10)], new Set(['a']))
    expect(batches).toEqual([{ seatAvailable: 3, seatTotal: 10, fingerprints: ['a'] }])
  })

  it('fingerprint 목록을 chunkSize로 자른다', () => {
    const readings = ['a', 'b', 'c', 'd', 'e'].map((f) => r(f, 1, 1))
    const batches = buildSeatUpdateBatches(readings, new Set(readings.map((x) => x.fingerprint)), 2)
    expect(batches.map((b) => b.fingerprints)).toEqual([['a', 'b'], ['c', 'd'], ['e']])
  })

  it('갱신할 게 없으면 빈 배열', () => {
    expect(buildSeatUpdateBatches([], new Set(['a']))).toEqual([])
  })
})
