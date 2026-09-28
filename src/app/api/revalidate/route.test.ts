import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const revalidateTag = vi.fn()
vi.mock('next/cache', () => ({ revalidateTag: (...args: unknown[]) => revalidateTag(...args) }))

const { POST } = await import('./route')

const call = (auth?: string) =>
  POST(new Request('http://localhost/api/revalidate', { method: 'POST', headers: auth ? { authorization: auth } : {} }))

describe('POST /api/revalidate', () => {
  beforeEach(() => { vi.stubEnv('CRON_SECRET', 's3cret'); revalidateTag.mockClear() })
  afterEach(() => vi.unstubAllEnvs())

  it('비밀값이 없거나 틀리면 401이고 아무것도 무효화하지 않는다', async () => {
    expect((await call()).status).toBe(401)
    expect((await call('Bearer wrong')).status).toBe(401)
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it('서버에 CRON_SECRET이 없으면 어떤 요청도 받지 않는다', async () => {
    vi.stubEnv('CRON_SECRET', '')
    expect((await call('Bearer ')).status).toBe(401)
  })

  it('맞는 비밀값이면 상영 데이터 태그를 stale-while-revalidate(max)로 무효화한다', async () => {
    const res = await call('Bearer s3cret')
    expect(res.status).toBe(200)
    expect(revalidateTag).toHaveBeenCalledWith('movie-showtimes', 'max')
    expect(revalidateTag.mock.calls.every(([, profile]) => profile === 'max')).toBe(true)
  })
})
