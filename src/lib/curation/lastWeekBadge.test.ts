import { describe, expect, it } from 'vitest'
import { getLastWeekBadgeText } from './lastWeekBadge'

describe('getLastWeekBadgeText', () => {
  it('always says "오늘이 마지막" for daysLeft 0, regardless of confidence', () => {
    expect(getLastWeekBadgeText(0, 'confirmed')).toBe('오늘이 마지막')
    expect(getLastWeekBadgeText(0, 'likely')).toBe('오늘이 마지막')
  })

  it('uses assertive "종영" copy only when confirmed', () => {
    expect(getLastWeekBadgeText(3, 'confirmed')).toBe('D-3 종영')
  })

  it('uses softened "막바지 상영" copy when likely', () => {
    expect(getLastWeekBadgeText(3, 'likely')).toBe('D-3 막바지 상영')
  })
})
