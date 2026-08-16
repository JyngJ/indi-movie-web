import { NextResponse, type NextRequest } from 'next/server'
import { exchangeKakaoCode, KAKAO_CALLBACK_PATH, kakaoEnv, publicOrigin } from '@/lib/auth/kakao'
import { sanitizeReturnTo } from '@/lib/auth/types'
import { createSupabaseAuthServerClient } from '@/lib/supabase/auth-server'

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

  let idToken: string
  let accessToken: string
  try {
    const tok = await exchangeKakaoCode({
      code,
      clientId,
      clientSecret,
      redirectUri: `${origin}${KAKAO_CALLBACK_PATH}`,
    })
    idToken = tok.id_token
    accessToken = tok.access_token
  } catch (e) {
    console.error('[auth/kakao] token exchange', e)
    return fail('kakao_token_exchange')
  }

  const supabase = await createSupabaseAuthServerClient()
  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'kakao',
    token: idToken,
    access_token: accessToken,
    nonce,
  })
  if (error) {
    console.error('[auth/kakao] signInWithIdToken', error)
    return fail(error.code ?? 'supabase_id_token')
  }

  const res = NextResponse.redirect(`${origin}${next}`)
  clearOauthCookies(res)
  return res
}

function clearOauthCookies(res: NextResponse) {
  for (const name of ['kakao_oauth_state', 'kakao_oauth_nonce', 'kakao_oauth_next']) {
    res.cookies.set(name, '', { path: '/auth/kakao', maxAge: 0 })
  }
}
