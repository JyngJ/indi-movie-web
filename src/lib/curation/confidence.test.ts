import { describe, expect, it } from 'vitest'
import { combineConfidence } from './confidence'

describe('combineConfidence', () => {
  it('is likely when leadtime is not confirmed, regardless of KOBIS', () => {
    expect(combineConfidence(false, true, true)).toBe('likely')
    expect(combineConfidence(false, false, false)).toBe('likely')
  })

  it('is confirmed when leadtime passes and KOBIS has no match (bonus signal, not a gate)', () => {
    expect(combineConfidence(true, false, false)).toBe('confirmed')
  })

  it('is confirmed when leadtime passes and KOBIS shows a declining screen count', () => {
    expect(combineConfidence(true, true, true)).toBe('confirmed')
  })

  it('is downgraded to likely when KOBIS matches but screen count is not declining', () => {
    expect(combineConfidence(true, true, false)).toBe('likely')
  })
})
