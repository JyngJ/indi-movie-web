import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseAuthServerClient } from '@/lib/supabase/auth-server'
import { sanitizeReturnTo } from '@/lib/auth/types'

export const dynamic = 'force-dynamic'

/**
 * OAuth 콜백. Supabase가 제공자 인증을 끝내고 ?code=… 로 여기로 보낸다.
 * code → 세션 교환(쿠키 저장) 후 ?next= 경로로 리다이렉트.
 * 실패하면 /my?auth_error=1 로 보내서 로그인 화면이 안내한다.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = sanitizeReturnTo(searchParams.get('next'), '/my')

  if (!code) {
    return NextResponse.redirect(`${origin}/my?auth_error=missing_code`)
  }

  const supabase = await createSupabaseAuthServerClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(`${origin}/my?auth_error=${encodeURIComponent(error.code ?? 'exchange_failed')}`)
  }

  // Vercel 뒤에서는 request.url이 내부 호스트일 수 있어 x-forwarded-host를 우선한다.
  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocal = process.env.NODE_ENV === 'development'
  const base = !isLocal && forwardedHost ? `https://${forwardedHost}` : origin
  return NextResponse.redirect(`${base}${next}`)
}
