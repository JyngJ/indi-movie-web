import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSessionContext } from './session'
import { formatVisitRef, VISIT_REF_TTL_MS } from './visitRef'

function stubBrowser(cookie: string) {
  const store = new Map<string, string>()

  vi.stubGlobal('window', {
    sessionStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value) },
      removeItem: (key: string) => { store.delete(key) },
    },
    location: { pathname: '/', search: '' },
    innerWidth: 390,
    innerHeight: 844,
    matchMedia: () => ({ matches: false }),
  })
  vi.stubGlobal('document', { cookie, referrer: '' })

  return {
    setCookie(next: string) {
      vi.stubGlobal('document', { cookie: next, referrer: '' })
    },
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getSessionContext · visit_ref', () => {
  it('/p 쿠키가 살아있으면 유입 태그를 붙인다', () => {
    stubBrowser(`vref=${formatVisitRef('pf', Date.now())}`)
    expect(getSessionContext().visit_ref).toBe('pf')
  })

  it('쿠키가 없으면 태그를 붙이지 않는다', () => {
    stubBrowser('')
    expect(getSessionContext().visit_ref).toBeNull()
  })

  it('발급 시각이 없는 옛 쿠키는 만료로 본다', () => {
    // 90일 Max-Age 시절(#311 이전)에 심겨 아직 브라우저에 남아 있는 값.
    stubBrowser('vref=pf')
    expect(getSessionContext().visit_ref).toBeNull()
  })

  it('태깅 창을 넘긴 쿠키는 만료로 본다', () => {
    const stale = Date.now() - VISIT_REF_TTL_MS - 1
    stubBrowser(`vref=${formatVisitRef('pf', stale)}`)
    expect(getSessionContext().visit_ref).toBeNull()
  })

  it('쿠키가 만료되면 같은 세션이어도 태그가 사라진다', () => {
    const browser = stubBrowser(`vref=${formatVisitRef('pf', Date.now())}`)

    const tagged = getSessionContext()
    expect(tagged.visit_ref).toBe('pf')

    // 30분이 지나 쿠키만 사라진 상태. 세션(sessionStorage)은 그대로다.
    browser.setCookie('')
    const untagged = getSessionContext()

    expect(untagged.analytics_session_id).toBe(tagged.analytics_session_id)
    expect(untagged.visit_ref).toBeNull()
  })
})
