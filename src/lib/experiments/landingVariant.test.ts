import { describe, expect, it, vi } from 'vitest'
import type { IStorageAdapter } from '@/lib/adapters/storage'
import { ONBOARDING_SEEN_KEY } from '@/lib/onboarding'
import { LANDING_VARIANT_KEY, getOrAssignLandingVariant } from './landingVariant'

function memoryAdapter(initial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initial))
  const adapter: IStorageAdapter = {
    async getItem(key) {
      return store.has(key) ? store.get(key)! : null
    },
    async setItem(key, value) {
      store.set(key, value)
      return true
    },
    async removeItem(key) {
      store.delete(key)
    },
  }
  return { adapter, store }
}

describe('getOrAssignLandingVariant', () => {
  it('신규 방문자는 랜덤 배정 후 영속화한다', async () => {
    const { adapter, store } = memoryAdapter()
    const variant = await getOrAssignLandingVariant(adapter, () => 0.9) // 0.5 이상 → test
    expect(variant).toBe('test')
    expect(store.get(LANDING_VARIANT_KEY)).toBe('test')
  })

  it('random < 0.5면 control로 배정한다', async () => {
    const { adapter } = memoryAdapter()
    const variant = await getOrAssignLandingVariant(adapter, () => 0.1)
    expect(variant).toBe('control')
  })

  it('이미 배정된 값이 있으면 재추첨하지 않는다', async () => {
    const { adapter } = memoryAdapter({ [LANDING_VARIANT_KEY]: 'test' })
    const variant = await getOrAssignLandingVariant(adapter, () => 0.1) // control이 나올 랜덤값이어도
    expect(variant).toBe('test')
  })

  it('실험 이전부터 있던 기존 유저(ONBOARDING_SEEN_KEY만 존재)는 저장 없이 control을 반환한다', async () => {
    const { adapter, store } = memoryAdapter({ [ONBOARDING_SEEN_KEY]: '2026-01-01T00:00:00.000Z' })
    const variant = await getOrAssignLandingVariant(adapter, () => 0.9)
    expect(variant).toBe('control')
    expect(store.has(LANDING_VARIANT_KEY)).toBe(false)
  })

  it('쓰기 실패 시(프라이빗 모드 등) 세션 내 재추첨하지 않는다', async () => {
    vi.resetModules()
    const { getOrAssignLandingVariant: freshGetOrAssign } = await import('./landingVariant')
    let callCount = 0
    const failingAdapter: IStorageAdapter = {
      async getItem() {
        return null
      },
      async setItem() {
        return false // 쓰기 실패 시뮬레이션
      },
      async removeItem() {},
    }
    const random = () => {
      callCount += 1
      return callCount === 1 ? 0.9 : 0.1 // 두 번째 호출에선 다른 값이 나와도 무시돼야 함
    }
    const first = await freshGetOrAssign(failingAdapter, random)
    const second = await freshGetOrAssign(failingAdapter, random)
    expect(first).toBe(second)
  })
})
