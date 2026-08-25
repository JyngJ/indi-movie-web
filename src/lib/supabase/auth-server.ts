import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * 로그인 세션(쿠키)을 읽는 서버용 Supabase 클라이언트.
 * 서버 컴포넌트·Server Action·route handler에서 사용. 요청마다 새로 만든다.
 *
 * 기존 createSupabaseServerClient(server.ts)는 쿠키를 안 읽는 익명 클라이언트라
 * 캐시되는 SEO/카탈로그 경로에서 계속 쓴다. 사용자 컨텍스트가 필요한 곳만 이걸 쓴다.
 * (cookies()를 부르면 그 렌더는 동적이 되므로 캐시 경로에 섞지 말 것.)
 */
export async function createSupabaseAuthServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase 환경 변수가 설정되지 않았습니다.')

  const cookieStore = await cookies()

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // 서버 컴포넌트에서는 쿠키를 못 쓴다. proxy.ts가 세션 리프레시를 담당하므로 무시해도 된다.
        }
      },
    },
  })
}
