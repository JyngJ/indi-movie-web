import { describe, expect, it } from 'vitest'
import { SSR_SNAPSHOT_MAX_AGE_MS, snapshotUpdatedAt } from './ssrSnapshot'

describe('snapshotUpdatedAt', () => {
  const now = 1_790_000_000_000

  it('방금 읽은 데이터는 지금 시각으로 — 다시 받지 않는다', () => {
    expect(snapshotUpdatedAt(now - 1000, now)).toBe(now)
  })

  it('기준 시간 경계까지는 신선하다', () => {
    expect(snapshotUpdatedAt(now - SSR_SNAPSHOT_MAX_AGE_MS, now)).toBe(now)
  })

  it('기준보다 오래되면 0 — 마운트 직후 다시 받는다', () => {
    expect(snapshotUpdatedAt(now - SSR_SNAPSHOT_MAX_AGE_MS - 1, now)).toBe(0)
  })
})
