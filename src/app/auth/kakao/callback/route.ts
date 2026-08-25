import { NextResponse, type NextRequest } from 'next/server'
import { exchangeKakaoCode, KAKAO_CALLBACK_PATH, kakaoEnv, publicOrigin } from '@/lib/auth/kakao'
import { sanitizeReturnTo } from '@/lib/auth/types'
import { createSupabaseAuthServerClient } from '@/lib/supabase/auth-server'
import { saveKakaoTokens } from '@/lib/auth/kakaoTokenStore'
import type { KakaoTokenResponse } from '@/lib/auth/kakao'

export const dynamic = 'force-dynamic'

/**
 * 카카오 인가 콜백. state 검증 → code→토큰 → id_token으로 Supabase 세션 발급(쿠키) → next로 이동.
 * 실패는 /my?auth_error=<code> 로 보낸다.
 */
export async function GET(request: NextRequest) {
  const origin = publicOrigin(request)
  const sp = request.nextUrl.searchParams
  const cookies = request.cookies

  const fail = (code: string) => {
    const res = NextResponse.redirect(`${origin}/my?auth_error=${encodeURIComponent(code)}`)
    clearOauthCookies(res)
    return res
  }

  // 카카오가 에러로 돌려보낸 경우 (사용자 취소 등)
  const providerError = sp.get('error')
  if (providerError) return fail(`kakao_${providerError}`)

  const code = sp.get('code')
  const state = sp.get('state')
  const savedState = cookies.get('kakao_oauth_state')?.value
  const nonce = cookies.get('kakao_oauth_nonce')?.value
  const next = sanitizeReturnTo(cookies.get('kakao_oauth_next')?.value, '/my')

  if (!code) return fail('missing_code')
  if (!state || !savedState || state !== savedState) return fail('state_mismatch')
  if (!nonce) return fail('missing_nonce')

  const { clientId, clientSecret } = kakaoEnv()

  let tok: KakaoTokenResponse
  try {
    tok = await exchangeKakaoCode({
      code,
      clientId,
      clientSecret,
      redirectUri: `${origin}${KAKAO_CALLBACK_PATH}`,
    })
  } catch (e) {
    console.error('[auth/kakao] token exchange', e)
    return fail('kakao_token_exchange')
  }

  const supabase = await createSupabaseAuthServerClient()
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'kakao',
    token: tok.id_token,
    access_token: tok.access_token,
    nonce,
  })
  if (error || !data.user) {
    console.error('[auth/kakao] signInWithIdToken', error)
    return fail(error?.code ?? 'supabase_id_token')
  }

  // 카카오 토큰 보관 — 카톡 "나에게 보내기" 알림용. 실패해도 로그인은 성공으로 처리(알림만 못 보냄).
  try {
    const kakaoUserId = String((data.user.user_metadata as Record<string, unknown> | undefined)?.provider_id ?? '') || null
    await saveKakaoTokens(data.user.id, kakaoUserId, tok)
  } catch (e) {
    console.error('[auth/kakao] saveKakaoTokens', e)
  }

  // 신규 가입 판별 — auth.users.created_at이 방금이면 첫 로그인. 클라이언트가
  // auth_login 파라미터를 읽어 'signed up'/'logged in' 이벤트를 찍고 지운다.
  const createdAt = data.user.created_at ? Date.parse(data.user.created_at) : 0
  const isNew = createdAt > 0 && Date.now() - createdAt < 60_000
  const sep = next.includes('?') ? '&' : '?'
  const res = NextResponse.redirect(`${origin}${next}${sep}auth_login=${isNew ? 'new' : 'ok'}`)
  clearOauthCookies(res)
  return res
}

function clearOauthCookies(res: NextResponse) {
  for (const name of ['kakao_oauth_state', 'kakao_oauth_nonce', 'kakao_oauth_next']) {
    res.cookies.set(name, '', { path: '/auth/kakao', maxAge: 0 })
  }
}
