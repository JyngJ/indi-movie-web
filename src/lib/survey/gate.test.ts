import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/** localStorage / sessionStorage 최소 스텁 — 노드 환경에서 게이트 로직만 검증한다 */
function makeStorage() {
  const map = new Map<string, string>()
  return {
    map,
    api: {
      getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
      setItem: (k: string, v: string) => { map.set(k, String(v)) },
      removeItem: (k: string) => { map.delete(k) },
      clear: () => map.clear(),
    },
  }
}

function installBrowserGlobals() {
  const local = makeStorage()
  const session = makeStorage()
  vi.stubGlobal('localStorage', local.api)
  vi.stubGlobal('sessionStorage', session.api)
  vi.stubGlobal('window', { localStorage: local.api, sessionStorage: session.api })
  return { local, session }
}

/** 모듈 상태(세션 플래그)가 테스트끼리 새지 않도록 매번 새로 import */
async function freshGate() {
  vi.resetModules()
  return {
    gate: await import('./gate'),
    onboarding: await import('@/lib/onboarding'),
    storage: (await import('@/lib/adapters/storage')).storageAdapter,
  }
}

describe('shouldShowSurvey', () => {
  let stores: ReturnType<typeof installBrowserGlobals>

  beforeEach(() => { stores = installBrowserGlobals() })
  afterEach(() => { vi.unstubAllGlobals() })

  it('첫 방문에는 노출하지 않는다', async () => {
    const { gate } = await freshGate()
    expect(await gate.shouldShowSurvey()).toBe(false)
  })

  it('온보딩을 끝낸 재방문자에게 노출한다', async () => {
    const { gate } = await freshGate()
    stores.local.map.set('movie:visits:v1', '1')
    stores.local.map.set('onboarding_seen_v1', '2026-01-01')

    expect(await gate.shouldShowSurvey()).toBe(true)
  })

  it('온보딩을 끝내지 않은 재방문자에게는 노출하지 않는다 (겹침 방지)', async () => {
    const { gate } = await freshGate()
    // 1회차에 온보딩을 안 끝내고 이탈 → 방문 수만 올라가 있고 seen 플래그는 없다
    stores.local.map.set('movie:visits:v1', '1')

    expect(await gate.shouldShowSurvey()).toBe(false)
  })

  it('온보딩을 방금 끝낸 세션에는 노출하지 않는다', async () => {
    const { gate, onboarding, storage } = await freshGate()
    stores.local.map.set('movie:visits:v1', '1')
    await onboarding.markOnboardingSeen(storage)

    expect(onboarding.didOnboardThisSession()).toBe(true)
    expect(await gate.shouldShowSurvey()).toBe(false)
  })

  it('이미 응답/닫기 한 사람에게는 노출하지 않는다', async () => {
    const { gate } = await freshGate()
    stores.local.map.set('movie:visits:v1', '1')
    stores.local.map.set('onboarding_seen_v1', '2026-01-01')
    stores.local.map.set('movie:survey:v1', 'dismissed')

    expect(await gate.shouldShowSurvey()).toBe(false)
  })

  it('같은 세션에서 새로고침해도 방문 수는 한 번만 오른다', async () => {
    const { gate } = await freshGate()
    stores.local.map.set('onboarding_seen_v1', '2026-01-01')

    await gate.shouldShowSurvey()
    await gate.shouldShowSurvey()

    expect(stores.local.map.get('movie:visits:v1')).toBe('1')
  })
})
