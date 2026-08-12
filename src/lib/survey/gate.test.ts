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

/** 온보딩을 끝낸 상태에서 visits 회차로 진입한 상황 */
function seedOnboardedVisitor(local: ReturnType<typeof makeStorage>, previousVisits: number) {
  local.map.set('movie:visits:v1', String(previousVisits))
  local.map.set('onboarding_seen_v1', '2026-01-01')
}

describe('shouldShowSurvey — 노출 회차', () => {
  let stores: ReturnType<typeof installBrowserGlobals>

  beforeEach(() => { stores = installBrowserGlobals() })
  afterEach(() => { vi.unstubAllGlobals() })

  it('첫 방문에는 노출하지 않는다', async () => {
    const { gate } = await freshGate()
    expect(await gate.shouldShowSurvey()).toBeNull()
  })

  it.each([2, 5, 10])('%i회차에는 노출한다', async (visits) => {
    const { gate } = await freshGate()
    seedOnboardedVisitor(stores.local, visits - 1)

    expect(await gate.shouldShowSurvey()).toBe(visits)
  })

  it.each([3, 4, 6, 9, 11, 20])('%i회차에는 노출하지 않는다', async (visits) => {
    const { gate } = await freshGate()
    seedOnboardedVisitor(stores.local, visits - 1)

    expect(await gate.shouldShowSurvey()).toBeNull()
  })

  it('마일스톤을 다 쓰면(10회차 이후) 다시 묻지 않는다', async () => {
    const { gate } = await freshGate()
    seedOnboardedVisitor(stores.local, 30)

    expect(await gate.shouldShowSurvey()).toBeNull()
    expect(gate.nextMilestone(31)).toBeNull()
  })
})

describe('shouldShowSurvey — 차단 조건', () => {
  let stores: ReturnType<typeof installBrowserGlobals>

  beforeEach(() => { stores = installBrowserGlobals() })
  afterEach(() => { vi.unstubAllGlobals() })

  it('온보딩을 끝내지 않은 재방문자에게는 노출하지 않는다 (겹침 방지)', async () => {
    const { gate } = await freshGate()
    // 1회차에 온보딩을 안 끝내고 이탈 → 방문 수만 올라가 있고 seen 플래그는 없다
    stores.local.map.set('movie:visits:v1', '1')

    expect(await gate.shouldShowSurvey()).toBeNull()
  })

  it('온보딩을 방금 끝낸 세션에는 노출하지 않는다', async () => {
    const { gate, onboarding, storage } = await freshGate()
    stores.local.map.set('movie:visits:v1', '1')
    await onboarding.markOnboardingSeen(storage)

    expect(onboarding.didOnboardThisSession()).toBe(true)
    expect(await gate.shouldShowSurvey()).toBeNull()
  })

  it('제출을 끝낸 사람에게는 다시 묻지 않는다', async () => {
    const { gate } = await freshGate()
    seedOnboardedVisitor(stores.local, 4)
    stores.local.map.set('movie:survey:v1', 'done')

    expect(await gate.shouldShowSurvey()).toBeNull()
  })

  it('예전에 영구 거부한 사람(legacy dismissed)도 계속 제외한다', async () => {
    const { gate } = await freshGate()
    seedOnboardedVisitor(stores.local, 4)
    stores.local.map.set('movie:survey:v1', 'dismissed')

    expect(await gate.shouldShowSurvey()).toBeNull()
  })

  it('같은 회차에 이미 노출했으면 다시 뜨지 않는다 (라우트 이동 리마운트)', async () => {
    const { gate } = await freshGate()
    seedOnboardedVisitor(stores.local, 1)

    const visits = await gate.shouldShowSurvey()
    expect(visits).toBe(2)
    await gate.markSurveyShown(visits!)

    expect(await gate.shouldShowSurvey()).toBeNull()
  })

  it('같은 세션에서 새로고침해도 방문 수는 한 번만 오른다', async () => {
    const { gate } = await freshGate()
    seedOnboardedVisitor(stores.local, 0)

    await gate.shouldShowSurvey()
    await gate.shouldShowSurvey()

    expect(stores.local.map.get('movie:visits:v1')).toBe('1')
  })
})

describe('"다음에" 흐름', () => {
  let stores: ReturnType<typeof installBrowserGlobals>

  beforeEach(() => { stores = installBrowserGlobals() })
  afterEach(() => { vi.unstubAllGlobals() })

  it('닫아도 상태를 소각하지 않아 다음 마일스톤에 다시 뜬다', async () => {
    const first = await freshGate()
    seedOnboardedVisitor(stores.local, 1)

    const at2 = await first.gate.shouldShowSurvey()
    expect(at2).toBe(2)
    await first.gate.markSurveyShown(at2!)
    // 닫기 = markSurvey를 부르지 않는다(= 소각 없음)

    // 3·4회차엔 안 뜨고 5회차에 다시 뜬다
    for (const previous of [2, 3]) {
      const skip = await freshGate()
      stores.session.map.clear()   // 새 세션
      stores.local.map.set('movie:visits:v1', String(previous))
      expect(await skip.gate.shouldShowSurvey()).toBeNull()
    }

    const next = await freshGate()
    stores.session.map.clear()
    stores.local.map.set('movie:visits:v1', '4')
    expect(await next.gate.shouldShowSurvey()).toBe(5)
  })

  it('nextMilestone은 남은 다음 회차를 알려준다', async () => {
    const { gate } = await freshGate()
    expect(gate.nextMilestone(2)).toBe(5)
    expect(gate.nextMilestone(5)).toBe(10)
    expect(gate.nextMilestone(10)).toBeNull()
  })
})
