import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { IStorageAdapter } from '@/lib/adapters/storage'

function memoryAdapter(initial: Record<string, string> = {}, writable = true) {
  const store = new Map<string, string>(Object.entries(initial))
  const adapter: IStorageAdapter = {
    async getItem(key) {
      return store.has(key) ? store.get(key)! : null
    },
    async setItem(key, value) {
      if (!writable) return false
      store.set(key, value)
      return true
    },
    async removeItem(key) {
      store.delete(key)
    },
  }
  return { adapter, store }
}

/** 세션 안전망(모듈 상태)이 테스트끼리 새지 않도록 매번 새로 import */
async function fresh() {
  vi.resetModules()
  return import('./onboarding')
}

describe('shouldShowHint', () => {
  beforeEach(() => vi.resetModules())

  it('본 적이 없으면 보여 준다', async () => {
    const { shouldShowHint } = await fresh()
    const { adapter } = memoryAdapter()
    expect(await shouldShowHint(adapter, 'intro')).toBe(true)
    expect(await shouldShowHint(adapter, 'mapPins')).toBe(true)
  })

  it('한 번 기록하면 다시 보여 주지 않는다', async () => {
    const { shouldShowHint, markHintSeen, HINT_KEYS } = await fresh()
    const { adapter, store } = memoryAdapter()
    await markHintSeen(adapter, 'intro')
    expect(store.has(HINT_KEYS.intro)).toBe(true)
    expect(await shouldShowHint(adapter, 'intro')).toBe(false)
  })

  it('힌트끼리는 따로 센다 — 소개를 봤어도 지도 힌트는 남는다', async () => {
    const { shouldShowHint, markHintSeen } = await fresh()
    const { adapter } = memoryAdapter()
    await markHintSeen(adapter, 'intro')
    expect(await shouldShowHint(adapter, 'mapPins')).toBe(true)
  })

  it('예전 온보딩을 끝낸 사람에게는 소개 카드를 다시 보여 주지 않는다', async () => {
    const { shouldShowHint, LEGACY_ONBOARDING_KEY } = await fresh()
    const { adapter } = memoryAdapter({ [LEGACY_ONBOARDING_KEY]: '2026-08-01' })
    expect(await shouldShowHint(adapter, 'intro')).toBe(false)
    expect(await shouldShowHint(adapter, 'mapPins')).toBe(true)
  })

  it('저장이 실패해도(프라이빗 모드) 같은 세션에서는 다시 뜨지 않는다', async () => {
    const { shouldShowHint, markHintSeen } = await fresh()
    const { adapter, store } = memoryAdapter({}, false)
    await markHintSeen(adapter, 'mapPins')
    expect(store.size).toBe(0)
    expect(await shouldShowHint(adapter, 'mapPins')).toBe(false)
  })
})
