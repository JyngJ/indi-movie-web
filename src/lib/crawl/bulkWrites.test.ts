import { describe, expect, it } from 'vitest'
import { chunk, dedupeByKey, isMatchUnchanged, isMissingRpcError } from './bulkWrites'

describe('isMatchUnchanged', () => {
  const base = { matchedTheaterId: 't1', matchedMovieId: 'm1', warnings: ['매진'], status: 'needs_review' }

  it('값이 모두 같으면 true', () => {
    expect(isMatchUnchanged(base, { ...base, warnings: ['매진'] })).toBe(true)
  })

  it('undefined와 null은 같은 값으로 본다', () => {
    expect(isMatchUnchanged({ ...base, matchedMovieId: undefined }, { ...base, matchedMovieId: null })).toBe(true)
  })

  it('매칭·상태·경고 중 하나라도 다르면 false', () => {
    expect(isMatchUnchanged(base, { ...base, matchedMovieId: 'm2' })).toBe(false)
    expect(isMatchUnchanged(base, { ...base, status: 'approved' })).toBe(false)
    expect(isMatchUnchanged(base, { ...base, warnings: [] })).toBe(false)
    expect(isMatchUnchanged(base, { ...base, warnings: ['매진', '예매 종료'] })).toBe(false)
  })
})

describe('dedupeByKey', () => {
  it('같은 키는 마지막 행만 남긴다', () => {
    const rows = [{ k: 'a', v: 1 }, { k: 'b', v: 2 }, { k: 'a', v: 3 }]
    expect(dedupeByKey(rows, (r) => r.k)).toEqual([{ k: 'a', v: 3 }, { k: 'b', v: 2 }])
  })
})

describe('chunk', () => {
  it('크기대로 자르고 남은 것은 마지막 묶음으로', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    expect(chunk([], 2)).toEqual([])
  })
})

describe('isMissingRpcError', () => {
  it('PGRST202 또는 함수 없음 메시지를 알아본다', () => {
    expect(isMissingRpcError({ code: 'PGRST202' })).toBe(true)
    expect(isMissingRpcError({ message: 'Could not find the function public.apply_candidate_seats' })).toBe(true)
    expect(isMissingRpcError({ code: '23502', message: 'null value' })).toBe(false)
    expect(isMissingRpcError(null)).toBe(false)
  })
})
