import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Supabase 세션 리프레시.
 * 만료 임박한 access token을 갱신하고 새 쿠키를 요청/응답 양쪽에 써 준다.
 * 서버 컴포넌트는 쿠키를 못 쓰므로 이 단계가 없으면 세션이 조용히 끊긴다.
 *
 * 리다이렉트/보호 라우트 로직은 여기 두지 않는다 — /my 등은 페이지에서 세션을 보고 분기한다.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return NextResponse.next({ request })

  // 세션 쿠키가 하나도 없으면 Supabase 호출 자체를 건너뛴다 (비로그인 트래픽이 대부분).
  const hasAuthCookie = request.cookies.getAll().some((c) => c.name.startsWith('sb-'))
  if (!hasAuthCookie) return NextResponse.next({ request })

  let response = NextResponse.next({ request })

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  // getUser()는 토큰을 서버에서 검증하고 필요 시 리프레시한다. 결과는 쓰지 않는다.
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    // 정적 파일·이미지·API·OG 이미지 제외
    '/((?!_next/static|_next/image|api/|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|txt|xml|woff2?)$).*)',
  ],
}
