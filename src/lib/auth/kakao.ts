/**
 * 카카오 OAuth(OIDC) 어댑터 — 서버 전용. 인프라 계층.
 *
 * Supabase 카카오 프로바이더를 쓰지 않는 이유: GoTrue가 account_email·profile_image 스코프를 하드코딩해서
 * 비즈 앱이 아닌 카카오 앱(이메일 동의항목 못 켬)에선 KOE205로 실패한다. 우리는 닉네임만 필요.
 * 그래서 카카오 인가는 직접 하고, 받은 id_token으로 Supabase 세션만 발급한다(signInWithIdToken).
 * 카카오 access token을 우리가 직접 들게 되므로 P3 "나에게 보내기"(talk_message)에도 그대로 쓸 수 있다.
 */

export const KAKAO_AUTHORIZE_URL = 'https://kauth.kakao.com/oauth/authorize'
export const KAKAO_TOKEN_URL = 'https://kauth.kakao.com/oauth/token'
export const KAKAO_CALLBACK_PATH = '/auth/kakao/callback'

/** 요청 스코프 — 개발자 콘솔 동의항목과 정확히 일치해야 함 (현재: 닉네임 필수 동의). openid는 OIDC id_token용 */
export const KAKAO_SCOPES = ['openid', 'profile_nickname'] as const

export interface KakaoTokenResponse {
  access_token: string
  refresh_token?: string
  id_token: string
  expires_in: number
  refresh_token_expires_in?: number
  scope?: string
  token_type: string
}

export function kakaoEnv() {
  const clientId = process.env.KAKAO_REST_API_KEY
  const clientSecret = process.env.KAKAO_CLIENT_SECRET
  if (!clientId) throw new Error('KAKAO_REST_API_KEY 환경 변수가 없습니다.')
  return { clientId, clientSecret }
}

/** 인가 URL 조립 (순수) */
export function buildKakaoAuthorizeUrl(params: {
  clientId: string
  redirectUri: string
  state: string
  nonce: string
}): string {
  const u = new URL(KAKAO_AUTHORIZE_URL)
  u.searchParams.set('response_type', 'code')
  u.searchParams.set('client_id', params.clientId)
  u.searchParams.set('redirect_uri', params.redirectUri)
  u.searchParams.set('scope', KAKAO_SCOPES.join(' '))
  u.searchParams.set('state', params.state)
  u.searchParams.set('nonce', params.nonce)
  return u.toString()
}

/** code → 토큰 교환 */
export async function exchangeKakaoCode(params: {
  code: string
  redirectUri: string
  clientId: string
  clientSecret?: string
}): Promise<KakaoTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    code: params.code,
  })
  if (params.clientSecret) body.set('client_secret', params.clientSecret)

  const res = await fetch(KAKAO_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body,
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`kakao token exchange failed: ${res.status} ${text.slice(0, 200)}`)
  }
  const json = (await res.json()) as KakaoTokenResponse
  if (!json.id_token) throw new Error('kakao token response has no id_token — 콘솔에서 OpenID Connect 활성화 확인')
  return json
}

/** 랜덤 URL-safe 문자열 (state/nonce) */
export function randomToken(bytes = 16): string {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Vercel 뒤에서는 request.url 호스트가 내부값일 수 있어 x-forwarded-host 우선 */
export function publicOrigin(request: { url: string; headers: { get(name: string): string | null } }): string {
  const forwardedHost = request.headers.get('x-forwarded-host')
  if (process.env.NODE_ENV !== 'development' && forwardedHost) return `https://${forwardedHost}`
  return new URL(request.url).origin
}
