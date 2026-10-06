import { describe, expect, it } from 'vitest'
import { isDureraumPlaceholder } from './crawler'

describe('isDureraumPlaceholder — 영화의전당 영화제 자리표시', () => {
  it('러닝타임 없이 00:00뿐이면 자리표시로 본다', () => {
    expect(isDureraumPlaceholder(['00:00'], undefined)).toBe(true)
  })
  it('러닝타임이 있거나 다른 시각이 섞이면 실제 회차다', () => {
    expect(isDureraumPlaceholder(['00:00'], '112')).toBe(false)
    expect(isDureraumPlaceholder(['10:00'], undefined)).toBe(false)
    expect(isDureraumPlaceholder(['00:00', '19:30'], undefined)).toBe(false)
  })
})
