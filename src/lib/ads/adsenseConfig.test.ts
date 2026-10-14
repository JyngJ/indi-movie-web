import { describe, expect, it } from 'vitest'
import { resolveDetailAdSlot } from './adsenseConfig'

describe('resolveDetailAdSlot', () => {
  it('프로덕션에 숫자 슬롯이 있으면 그 값을 쓴다', () => {
    expect(resolveDetailAdSlot({ vercelEnv: 'production', slot: ' 1234567890 ' })).toBe('1234567890')
  })

  it('프로덕션이 아니면 광고를 그리지 않는다', () => {
    expect(resolveDetailAdSlot({ vercelEnv: 'preview', slot: '1234567890' })).toBeNull()
    expect(resolveDetailAdSlot({ slot: '1234567890' })).toBeNull()
  })

  it('슬롯이 비었거나 숫자가 아니면 그리지 않는다 — 승인 전에는 변수를 비워 둔다', () => {
    expect(resolveDetailAdSlot({ vercelEnv: 'production' })).toBeNull()
    expect(resolveDetailAdSlot({ vercelEnv: 'production', slot: '' })).toBeNull()
    expect(resolveDetailAdSlot({ vercelEnv: 'production', slot: 'ca-pub-1' })).toBeNull()
  })
})
