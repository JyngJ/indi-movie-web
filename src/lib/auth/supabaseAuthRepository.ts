import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { mapSupabaseUser } from './mapUser'
import type { AuthRepository } from './repository'
import type { AuthProvider, AuthUser } from './types'
import { sanitizeReturnTo } from './types'

/** OAuth 콜백 라우트. 여기서 code → session 교환 후 returnTo로 보낸다 */
export const AUTH_CALLBACK_PATH = '/auth/callback'

/** 브라우저용 AuthRepository 구현 (Supabase Auth) */
export function createSupabaseAuthRepository(): AuthRepository {
  const supabase = createSupabaseBrowserClient()

  return {
    async getCurrentUser(): Promise<AuthUser | null> {
      // getUser()는 서버 검증. getSession()은 로컬 쿠키만 읽어서 위조 가능하므로 쓰지 않는다.
      const { data, error } = await supabase.auth.getUser()
      if (error) return null
      return mapSupabaseUser(data.user)
    },

    async signInWithProvider(provider: AuthProvider, returnTo: string) {
      const origin = window.location.origin
      const next = sanitizeReturnTo(returnTo)
      const redirectTo = `${origin}${AUTH_CALLBACK_PATH}?next=${encodeURIComponent(next)}`
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      })
      if (error) throw error
    },

    async signOut() {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    },

    async deleteAccount() {
      const { error } = await supabase.rpc('delete_own_account')
      if (error) throw error
      // 서버에서 계정이 지워졌으니 로컬 세션도 정리
      await supabase.auth.signOut({ scope: 'local' })
    },

    onAuthStateChange(cb) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        cb(mapSupabaseUser(session?.user))
      })
      return () => data.subscription.unsubscribe()
    },
  }
}
