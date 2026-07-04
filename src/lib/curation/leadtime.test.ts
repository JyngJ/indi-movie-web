import { describe, expect, it } from 'vitest'
import { computeLeadtimeDays, isLeadtimeConfirmed, toDailyMaxLeadtimeDiffs, MIN_LEADTIME_SAMPLES } from './leadtime'

describe('toDailyMaxLeadtimeDiffs', () => {
  it('keeps only the max diff per crawl day, not every show_date row', () => {
    // 같은 크롤일(07-05)에 나온 여러 show_date는 독립 표본이 아니라 "그날 본 최대 지평" 하나로 합친다
    const diffs = toDailyMaxLeadtimeDiffs([
      { showDate: '2026-07-06', createdAt: '2026-07-05T03:00:00Z' }, // diff 1
      { showDate: '2026-07-08', createdAt: '2026-07-05T04:00:00Z' }, // diff 3 — 같은 날, 더 먼 지평
      { showDate: '2026-07-07', createdAt: '2026-07-05T05:00:00Z' }, // diff 2 — 같은 날, 무시됨
      { showDate: '2026-07-14', createdAt: '2026-07-08T00:00:00Z' }, // diff 6 — 다른 크롤일
    ])
    expect(diffs.sort((a, b) => a - b)).toEqual([3, 6])
  })

  it('drops negative diffs (backfilled/corrected past rows)', () => {
    const diffs = toDailyMaxLeadtimeDiffs([
      { showDate: '2026-07-01', createdAt: '2026-07-05T00:00:00Z' },
      { showDate: '2026-07-10', createdAt: '2026-07-05T00:00:00Z' },
    ])
    expect(diffs).toEqual([5])
  })
})

describe('computeLeadtimeDays', () => {
  it('returns null when samples are below the minimum threshold', () => {
    const diffs = Array.from({ length: MIN_LEADTIME_SAMPLES - 1 }, () => 5)
    expect(computeLeadtimeDays(diffs)).toBeNull()
  })

  it('returns the p25 (conservative low end) of the sample distribution', () => {
    // 10 samples: sorted [1,1,2,3,4,5,6,7,8,9] -> idx floor(10*0.25)=2 -> value 2
    const diffs = [9, 1, 8, 3, 7, 4, 6, 1, 5, 2]
    expect(computeLeadtimeDays(diffs)).toBe(2)
  })
})

describe('isLeadtimeConfirmed', () => {
  it('confirms when every theater\'s max date is before its own leadtime horizon', () => {
    const result = isLeadtimeConfirmed(
      [{ theaterId: 't1', maxShowDate: '2026-07-08' }],
      new Map([['t1', 5]]), // horizon = today(07-05) + 5 = 07-10, maxShowDate 07-08 < horizon
      '2026-07-05',
    )
    expect(result).toBe(true)
  })

  it('does not confirm when a theater could still just not have published yet', () => {
    const result = isLeadtimeConfirmed(
      [{ theaterId: 't1', maxShowDate: '2026-07-10' }],
      new Map([['t1', 5]]), // horizon = 07-10, maxShowDate 07-10 is not < horizon
      '2026-07-05',
    )
    expect(result).toBe(false)
  })

  it('does not confirm when any theater has unknown leadtime, even if others pass', () => {
    const result = isLeadtimeConfirmed(
      [
        { theaterId: 't1', maxShowDate: '2026-07-06' },
        { theaterId: 't2', maxShowDate: '2026-07-06' },
      ],
      new Map([['t1', 5], ['t2', null]]),
      '2026-07-05',
    )
    expect(result).toBe(false)
  })

  it('does not confirm with no theaters at all', () => {
    expect(isLeadtimeConfirmed([], new Map(), '2026-07-05')).toBe(false)
  })
})
