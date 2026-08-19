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

/** 요청 스코프 — 개발자 콘솔 동의항목과 정확히 일치해야 함.
 *  openid: OIDC id_token / profile_nickname: 필수 동의 / talk_message: 선택 동의(카톡 "나에게 보내기" 알림, 거부해도 로그인 됨) */
export const KAKAO_SCOPES = ['openid', 'profile_nickname', 'talk_message'] as const

export interface KakaoTokenResponse {
  access_token: string
  refresh_token?: string
  id_token: string
  expires_in: number
  refresh_token_expires_in?: number
  /** 공백 구분. 사용자가 실제 동의한 스코프 (선택 동의 거부 시 빠짐) */
  scope?: string
  token_type: string
}

/** refresh 응답 — id_token 없음, refresh_token은 갱신됐을 때만 옴 */
export interface KakaoRefreshResponse {
  access_token: string
  expires_in: number
  refresh_token?: string
  refresh_token_expires_in?: number
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

/** sha256 hex — Supabase signInWithIdToken은 우리가 넘긴 nonce를 해시해서 id_token 클레임과 비교한다.
 *  카카오는 authorize에 준 nonce를 그대로 클레임에 넣으므로, 카카오에는 해시값을 보내고 Supabase에는 원본을 준다. */
export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** 랜덤 URL-safe 문자열 (state/nonce) */
export function randomToken(bytes = 16): string {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * 브라우저가 실제로 보고 있는 오리진. request.url은 dev에서 바인드 주소(0.0.0.0)로, Vercel에서는 내부 호스트로
 * 나올 수 있어 Host / x-forwarded-* 헤더를 우선한다. 카카오 redirect_uri는 콘솔 등록값과 문자열로 일치해야 한다.
 */
export function publicOrigin(request: { url: string; headers: { get(name: string): string | null } }): string {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  if (!host) return new URL(request.url).origin
  const proto =
    request.headers.get('x-forwarded-proto') ??
    (host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https')
  return `${proto}://${host}`
}

/** refresh_token → 새 access token (필요 시 새 refresh_token) */
export async function refreshKakaoToken(params: {
  refreshToken: string
  clientId: string
  clientSecret?: string
}): Promise<KakaoRefreshResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: params.clientId,
    refresh_token: params.refreshToken,
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
    throw new Error(`kakao token refresh failed: ${res.status} ${text.slice(0, 200)}`)
  }
  return (await res.json()) as KakaoRefreshResponse
}

export const KAKAO_MEMO_SEND_URL = 'https://kapi.kakao.com/v2/api/talk/memo/default/send'

/** 카카오톡 "나에게 보내기" — 텍스트 기본 템플릿. 사용자의 '나와의 채팅'방에 도착한다. */
export async function sendKakaoMemoText(params: {
  accessToken: string
  text: string
  linkUrl: string
  buttonTitle?: string
}): Promise<void> {
  const template = {
    object_type: 'text',
    text: params.text.slice(0, 200),
    link: { web_url: params.linkUrl, mobile_web_url: params.linkUrl },
    button_title: params.buttonTitle ?? '자세히 보기',
  }
  const body = new URLSearchParams({ template_object: JSON.stringify(template) })
  const res = await fetch(KAKAO_MEMO_SEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
    },
    body,
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`kakao memo send failed: ${res.status} ${text.slice(0, 300)}`)
  }
}
