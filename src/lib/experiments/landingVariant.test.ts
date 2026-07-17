import { describe, expect, it, vi } from 'vitest'
import type { IStorageAdapter } from '@/lib/adapters/storage'
import { ONBOARDING_SEEN_KEY } from '@/lib/onboarding'
import { LANDING_VARIANT_KEY, getOrAssignLandingVariant } from './landingVariant'

const LANDING_VARIANT_KEY_V1 = 'landing_variant_v1'

function memoryAdapter(initial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initial))
  let setItemCalls = 0
  const adapter: IStorageAdapter = {
    async getItem(key) {
      return store.has(key) ? store.get(key)! : null
    },
    async setItem(key, value) {
      setItemCalls += 1
      store.set(key, value)
      return true
    },
    async removeItem(key) {
      store.delete(key)
    },
  }
  return { adapter, store, getSetItemCalls: () => setItemCalls }
}

describe('getOrAssignLandingVariant', () => {
  it('신규 유저는 참가자로 랜덤 배정 후 v2 키에 영속화한다 (source: fresh)', async () => {
    vi.resetModules()
    const { getOrAssignLandingVariant: freshGetOrAssign } = await import('./landingVariant')
    const { adapter, store } = memoryAdapter()
    const assignment = await freshGetOrAssign(adapter, () => 0.9) // 0.5 이상 → test
    expect(assignment).toEqual({ variant: 'test', isExperimentParticipant: true, source: 'fresh' })
    expect(store.get(LANDING_VARIANT_KEY)).toBe('test')
  })

  it('random < 0.5면 control로 배정한다', async () => {
    vi.resetModules()
    const { getOrAssignLandingVariant: freshGetOrAssign } = await import('./landingVariant')
    const { adapter } = memoryAdapter()
    const assignment = await freshGetOrAssign(adapter, () => 0.1)
    expect(assignment.variant).toBe('control')
    expect(assignment.source).toBe('fresh')
  })

  it('v2 배정값이 있으면 재추첨하지 않는다 (source: stored)', async () => {
    vi.resetModules()
    const { getOrAssignLandingVariant: freshGetOrAssign } = await import('./landingVariant')
    const { adapter } = memoryAdapter({ [LANDING_VARIANT_KEY]: 'test' })
    const assignment = await freshGetOrAssign(adapter, () => 0.1) // control이 나올 랜덤값이어도
    expect(assignment).toEqual({ variant: 'test', isExperimentParticipant: true, source: 'stored' })
  })

  it('v2와 v1이 둘 다 있으면 v2(stored)가 우선한다', async () => {
    vi.resetModules()
    const { getOrAssignLandingVariant: freshGetOrAssign } = await import('./landingVariant')
    const { adapter } = memoryAdapter({ [LANDING_VARIANT_KEY]: 'test', [LANDING_VARIANT_KEY_V1]: 'control' })
    const assignment = await freshGetOrAssign(adapter, () => 0.1)
    expect(assignment).toEqual({ variant: 'test', isExperimentParticipant: true, source: 'stored' })
  })

  it('v1 라운드에서 이미 배정받은 유저는 legacy_v1 비참가자로 취급하고 아무것도 저장하지 않는다', async () => {
    vi.resetModules()
    const { getOrAssignLandingVariant: freshGetOrAssign } = await import('./landingVariant')
    const { adapter, store, getSetItemCalls } = memoryAdapter({ [LANDING_VARIANT_KEY_V1]: 'test' })
    const assignment = await freshGetOrAssign(adapter, () => 0.9)
    expect(assignment).toEqual({ variant: 'control', isExperimentParticipant: false, source: 'legacy_v1' })
    expect(store.has(LANDING_VARIANT_KEY)).toBe(false)
    expect(getSetItemCalls()).toBe(0)
  })

  it('v1과 ONBOARDING_SEEN_KEY가 둘 다 있으면 legacy_v1이 우선한다', async () => {
    vi.resetModules()
    const { getOrAssignLandingVariant: freshGetOrAssign } = await import('./landingVariant')
    const { adapter } = memoryAdapter({
      [LANDING_VARIANT_KEY_V1]: 'test',
      [ONBOARDING_SEEN_KEY]: '2026-01-01T00:00:00.000Z',
    })
    const assignment = await freshGetOrAssign(adapter, () => 0.9)
    expect(assignment.source).toBe('legacy_v1')
  })

  it('실험 이전부터 있던 기존 유저(ONBOARDING_SEEN_KEY만 존재)는 legacy_user 비참가자로 취급하고 아무것도 저장하지 않는다', async () => {
    vi.resetModules()
    const { getOrAssignLandingVariant: freshGetOrAssign } = await import('./landingVariant')
    const { adapter, store, getSetItemCalls } = memoryAdapter({ [ONBOARDING_SEEN_KEY]: '2026-01-01T00:00:00.000Z' })
    const assignment = await freshGetOrAssign(adapter, () => 0.9)
    expect(assignment).toEqual({ variant: 'control', isExperimentParticipant: false, source: 'legacy_user' })
    expect(store.has(LANDING_VARIANT_KEY)).toBe(false)
    expect(getSetItemCalls()).toBe(0)
  })

  it('쓰기 실패 시(프라이빗 모드 등) memory_fallback으로 세션 내 재추첨하지 않는다', async () => {
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
    expect(first.source).toBe('memory_fallback')
    expect(first.isExperimentParticipant).toBe(true)

    const second = await freshGetOrAssign(failingAdapter, random)
    expect(second).toEqual(first)
  })

  it('폴백 순서 회귀: memory_fallback을 세운 뒤 스토리지에 v2 값이 생기면 stored를 우선 반환한다', async () => {
    vi.resetModules()
    const { getOrAssignLandingVariant: freshGetOrAssign } = await import('./landingVariant')
    const failingAdapter: IStorageAdapter = {
      async getItem() {
        return null
      },
      async setItem() {
        return false
      },
      async removeItem() {},
    }
    const fallback = await freshGetOrAssign(failingAdapter, () => 0.9)
    expect(fallback.source).toBe('memory_fallback')

    // 같은 모듈 인스턴스(sessionAssignedFallback 유지) — 스토리지가 정상 복구되고
    // v2 배정값이 이미 저장돼 있는 상태로 다시 호출
    const { adapter: recoveredAdapter } = memoryAdapter({ [LANDING_VARIANT_KEY]: 'control' })
    const recovered = await freshGetOrAssign(recoveredAdapter, () => 0.9)
    expect(recovered).toEqual({ variant: 'control', isExperimentParticipant: true, source: 'stored' })
  })
})
