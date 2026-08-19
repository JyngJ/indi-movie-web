import { describe, expect, it } from 'vitest'
import type { User } from '@supabase/supabase-js'
import { mapSupabaseUser } from './mapUser'
import { sanitizeReturnTo } from './types'

describe('sanitizeReturnTo', () => {
  it('같은 오리진 path만 허용한다', () => {
    expect(sanitizeReturnTo('/my')).toBe('/my')
    expect(sanitizeReturnTo('/movie/abc?x=1')).toBe('/movie/abc?x=1')
  })

  it('외부 URL·프로토콜 상대 URL은 fallback', () => {
    expect(sanitizeReturnTo('https://evil.com')).toBe('/')
    expect(sanitizeReturnTo('//evil.com')).toBe('/')
    expect(sanitizeReturnTo('/\\evil.com')).toBe('/')
    expect(sanitizeReturnTo(null, '/my')).toBe('/my')
    expect(sanitizeReturnTo('', '/my')).toBe('/my')
  })
})

describe('mapSupabaseUser', () => {
  const base = {
    id: 'u1',
    aud: 'authenticated',
    app_metadata: {},
    created_at: '',
  } as unknown as User

  it('카카오 메타데이터를 매핑한다 (이메일 없음)', () => {
    const u = mapSupabaseUser({
      ...base,
      email: undefined,
      user_metadata: { name: '재용', avatar_url: 'https://k.kakaocdn.net/a.jpg' },
      identities: [{ provider: 'kakao' }] as User['identities'],
    })
    expect(u).toEqual({
      id: 'u1',
      email: null,
      displayName: '재용',
      avatarUrl: 'https://k.kakaocdn.net/a.jpg',
      providers: ['kakao'],
    })
  })

  it('구글 메타데이터 폴백 (full_name / picture)', () => {
    const u = mapSupabaseUser({
      ...base,
      email: 'a@b.com',
      user_metadata: { full_name: 'Jae', picture: 'https://g/p.png' },
      identities: [{ provider: 'google' }] as User['identities'],
    })
    expect(u?.displayName).toBe('Jae')
    expect(u?.avatarUrl).toBe('https://g/p.png')
    expect(u?.providers).toEqual(['google'])
  })

  it('null 입력은 null', () => {
    expect(mapSupabaseUser(null)).toBeNull()
  })
})

describe('buildKakaoAuthorizeUrl', () => {
  it('OIDC + 닉네임 스코프만 요청한다', async () => {
    const { buildKakaoAuthorizeUrl } = await import('./kakao')
    const u = new URL(buildKakaoAuthorizeUrl({ clientId: 'cid', redirectUri: 'http://localhost:3000/auth/kakao/callback', state: 's1', nonce: 'n1' }))
    expect(u.origin + u.pathname).toBe('https://kauth.kakao.com/oauth/authorize')
    expect(u.searchParams.get('scope')).toBe('openid profile_nickname talk_message')
    expect(u.searchParams.get('client_id')).toBe('cid')
    expect(u.searchParams.get('state')).toBe('s1')
    expect(u.searchParams.get('nonce')).toBe('n1')
    expect(u.searchParams.get('response_type')).toBe('code')
  })
})
