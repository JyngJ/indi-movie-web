import { describe, expect, it } from 'vitest'
import type { IStorageAdapter } from '@/lib/adapters/storage'
import { ONBOARDING_SEEN_KEY, markOnboardingSeen, shouldShowOnboarding } from './onboarding'

function memoryAdapter(initial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initial))
  const adapter: IStorageAdapter = {
    async getItem(key) {
      return store.has(key) ? store.get(key)! : null
    },
    async setItem(key, value) {
      store.set(key, value)
    },
    async removeItem(key) {
      store.delete(key)
    },
  }
  return { adapter, store }
}

describe('shouldShowOnboarding', () => {
  it('플래그가 없으면 노출한다', async () => {
    const { adapter } = memoryAdapter()
    expect(await shouldShowOnboarding(adapter)).toBe(true)
  })

  it('플래그가 있으면 노출하지 않는다 (값 내용 무관)', async () => {
    const { adapter } = memoryAdapter({ [ONBOARDING_SEEN_KEY]: '1' })
    expect(await shouldShowOnboarding(adapter)).toBe(false)
  })

  it('빈 문자열 값도 "본 것"으로 취급한다', async () => {
    const { adapter } = memoryAdapter({ [ONBOARDING_SEEN_KEY]: '' })
    expect(await shouldShowOnboarding(adapter)).toBe(false)
  })
})

describe('markOnboardingSeen', () => {
  it('기록 후에는 다시 노출하지 않는다', async () => {
    const { adapter } = memoryAdapter()
    await markOnboardingSeen(adapter)
    expect(await shouldShowOnboarding(adapter)).toBe(false)
  })

  it('버전 키(onboarding_seen_v1)에 기록한다', async () => {
    const { adapter, store } = memoryAdapter()
    await markOnboardingSeen(adapter)
    expect(store.has('onboarding_seen_v1')).toBe(true)
  })

  it('플래그 삭제(localStorage 클리어 상황) 시 다시 노출된다', async () => {
    const { adapter } = memoryAdapter()
    await markOnboardingSeen(adapter)
    await adapter.removeItem(ONBOARDING_SEEN_KEY)
    expect(await shouldShowOnboarding(adapter)).toBe(true)
  })
})
