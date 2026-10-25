import { describe, expect, it } from 'vitest'
import { isAlmostSoldOut, isSoldOut } from './seatAvailability'

describe('isSoldOut', () => {
  it('총 좌석이 있고 잔여가 0이면 매진', () => {
    expect(isSoldOut(0, 80)).toBe(true)
  })
  it('0/0은 좌석을 안 주는 소스라 매진이 아니다', () => {
    expect(isSoldOut(0, 0)).toBe(false)
  })
  it('남은 좌석이 있으면 매진이 아니다', () => {
    expect(isSoldOut(1, 80)).toBe(false)
  })
})

describe('isAlmostSoldOut', () => {
  it('잔여 15% 이하만 임박, 매진·미수집은 제외', () => {
    expect(isAlmostSoldOut(12, 80)).toBe(true)
    expect(isAlmostSoldOut(13, 80)).toBe(false)
    expect(isAlmostSoldOut(0, 80)).toBe(false)
    expect(isAlmostSoldOut(0, 0)).toBe(false)
  })
})
