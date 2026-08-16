import { NextResponse, type NextRequest } from 'next/server'
import { buildKakaoAuthorizeUrl, KAKAO_CALLBACK_PATH, kakaoEnv, publicOrigin, randomToken, sha256Hex } from '@/lib/auth/kakao'
import { sanitizeReturnTo } from '@/lib/auth/types'

export const dynamic = 'force-dynamic'

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/auth/kakao',
  maxAge: 60 * 10,
}

/**
 * 카카오 로그인 시작. state·nonce를 httpOnly 쿠키에 심고 카카오 인가 페이지로 보낸다.
 * ?next=경로 는 로그인 후 복귀 위치 (같은 오리진 path만).
 */
export async function GET(request: NextRequest) {
  const { clientId } = kakaoEnv()
  const origin = publicOrigin(request)
  const next = sanitizeReturnTo(request.nextUrl.searchParams.get('next'), '/my')

  const state = randomToken()
  const nonce = randomToken()
  const url = buildKakaoAuthorizeUrl({
    clientId,
    redirectUri: `${origin}${KAKAO_CALLBACK_PATH}`,
    state,
    // 카카오 id_token nonce 클레임 = 이 값. Supabase가 원본 nonce를 sha256해서 대조하므로 해시를 보낸다.
    nonce: await sha256Hex(nonce),
  })

  const res = NextResponse.redirect(url)
  res.cookies.set('kakao_oauth_state', state, COOKIE_OPTS)
  res.cookies.set('kakao_oauth_nonce', nonce, COOKIE_OPTS)
  res.cookies.set('kakao_oauth_next', next, COOKIE_OPTS)
  return res
}
