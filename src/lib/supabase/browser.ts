import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | null = null

/**
 * 브라우저용 Supabase 클라이언트 (싱글턴).
 * @supabase/ssr의 createBrowserClient — 세션을 쿠키에 저장하므로
 * 서버 컴포넌트/route handler(createSupabaseAuthServerClient)와 세션을 공유한다.
 */
export function createSupabaseBrowserClient() {
  if (browserClient) return browserClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase 공개 환경 변수가 설정되지 않았습니다.')
  }

  browserClient = createBrowserClient(supabaseUrl, anonKey)
  return browserClient
}
