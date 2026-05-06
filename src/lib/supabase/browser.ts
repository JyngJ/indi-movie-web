import { createClient } from '@supabase/supabase-js'

export function createSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase 공개 환경 변수가 설정되지 않았습니다.')
  }

  return createClient(supabaseUrl, anonKey)
}
