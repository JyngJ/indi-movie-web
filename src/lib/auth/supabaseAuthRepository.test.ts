import { afterEach, expect, it, vi } from 'vitest'
import { createSupabaseAuthRepository } from './supabaseAuthRepository'

const mocks = vi.hoisted(() => ({ oauth: vi.fn(async () => ({ error: null })) }))
vi.mock('@/lib/supabase/browser', () => ({ createSupabaseBrowserClient: () => ({ auth: { signInWithOAuth: mocks.oauth } }) }))
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.clearAllMocks() })

it('비활성 Google 제공자로 이동하지 않는다', async () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://auth.example.com')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'public-test-key')
  vi.stubGlobal('window', { location: { origin: 'https://movie.example.com' } })
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ external: { google: false } }))))
  await expect(createSupabaseAuthRepository().signInWithProvider('google', '/my')).rejects.toThrow('OAuth provider unavailable')
  expect(mocks.oauth).not.toHaveBeenCalled()
})

it('활성 Google 제공자에는 검증한 복귀 경로로 OAuth를 요청한다', async () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://auth.example.com')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'public-test-key')
  vi.stubGlobal('window', { location: { origin: 'https://movie.example.com' } })
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ external: { google: true } }))))
  await createSupabaseAuthRepository().signInWithProvider('google', '//outside.example.com')
  expect(mocks.oauth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: 'https://movie.example.com/auth/callback?next=%2F' } })
})
