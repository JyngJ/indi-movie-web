import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchWithTimeout } from './fetchWithTimeout'

/** 응답이 영영 오지 않는 서버 — signal이 끊어야만 끝난다 */
function hangingFetch() {
  return vi.fn((_input: unknown, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true })
  }))
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('fetchWithTimeout', () => {
  it('제한 시간이 지나면 TimeoutError로 거부한다 — 스켈레톤이 영원히 남지 않는다', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', hangingFetch())
    const pending = fetchWithTimeout('/api/public/click-rankings', { timeoutMs: 8000 })
    const assertion = expect(pending).rejects.toMatchObject({ name: 'TimeoutError' })
    await vi.advanceTimersByTimeAsync(8000)
    await assertion
  })

  it('바깥 signal(react-query 취소)이 먼저 끊으면 그 이유로 거부한다', async () => {
    vi.stubGlobal('fetch', hangingFetch())
    const outer = new AbortController()
    const pending = fetchWithTimeout('/x', { timeoutMs: 8000, signal: outer.signal })
    outer.abort(new DOMException('unmounted', 'AbortError'))
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('제때 오면 응답을 그대로 돌려주고 타이머를 정리한다', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"booking":[],"views":[]}', { status: 200 })))
    const res = await fetchWithTimeout('/x', { timeoutMs: 8000 })
    expect(res.status).toBe(200)
    expect(vi.getTimerCount()).toBe(0)
  })
})
