import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { mapSupabaseUser } from './mapUser'
import type { AuthRepository } from './repository'
import type { AuthProvider, AuthUser } from './types'
import { sanitizeReturnTo } from './types'

/** OAuth 콜백 라우트. 여기서 code → session 교환 후 returnTo로 보낸다 */
export const AUTH_CALLBACK_PATH = '/auth/callback'

/** 카카오는 Supabase 프로바이더가 아니라 우리 route(/auth/kakao/start → callback → signInWithIdToken)로 간다.
 *  이유는 src/lib/auth/kakao.ts 상단 주석 참고 (GoTrue 하드코딩 스코프 → KOE205). */
export const KAKAO_START_PATH = '/auth/kakao/start'

interface ProfileRow {
  display_name: string | null
  avatar_url: string | null
}

/**
 * auth.users 메타데이터 위에 public.users(앱이 편집하는 프로필)를 얹는다.
 * 트리거가 방금 만든 행이 아직 없거나 RLS로 못 읽으면 auth 메타데이터만 쓴다.
 */
async function toAuthUser(supabase: SupabaseClient, user: User | null | undefined): Promise<AuthUser | null> {
  const base = mapSupabaseUser(user)
  if (!base) return null
  const { data } = await supabase
    .from('users')
    .select('display_name, avatar_url')
    .eq('id', base.id)
    .maybeSingle<ProfileRow>()
  if (!data) return base
  return {
    ...base,
    displayName: data.display_name ?? base.displayName,
    avatarUrl: data.avatar_url ?? base.avatarUrl,
  }
}

/** 브라우저용 AuthRepository 구현 (Supabase Auth) */
export function createSupabaseAuthRepository(): AuthRepository {
  const supabase = createSupabaseBrowserClient()

  return {
    async getCurrentUser(): Promise<AuthUser | null> {
      // getUser()는 서버 검증. getSession()은 로컬 쿠키만 읽어서 위조 가능하므로 쓰지 않는다.
      const { data, error } = await supabase.auth.getUser()
      if (error) return null
      return toAuthUser(supabase, data.user)
    },

    async signInWithProvider(provider: AuthProvider, returnTo: string) {
      const origin = window.location.origin
      const next = sanitizeReturnTo(returnTo)

      if (provider === 'kakao') {
        window.location.assign(`${KAKAO_START_PATH}?next=${encodeURIComponent(next)}`)
        return
      }

      const redirectTo = `${origin}${AUTH_CALLBACK_PATH}?next=${encodeURIComponent(next)}`
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      })
      if (error) throw error
    },

    async signOut() {
      /* 전역 로그아웃은 리프레시 토큰이 이미 만료·회수됐으면 403으로 실패한다
         (session_not_found — 재로그인 후 옛 토큰 등). 그 경우에도 이 기기의
         세션은 지워져야 하므로 local로 폴백한다 (2026-08-24) */
      const { error } = await supabase.auth.signOut()
      if (error) {
        const { error: localError } = await supabase.auth.signOut({ scope: 'local' })
        if (localError) throw localError
      }
    },

    async updateDisplayName(displayName: string) {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) throw userError ?? new Error('not authenticated')
      const { error } = await supabase
        .from('users')
        .update({ display_name: displayName })
        .eq('id', userData.user.id)
      if (error) throw error
      return toAuthUser(supabase, userData.user)
    },

    async deleteAccount() {
      const { error } = await supabase.rpc('delete_own_account')
      if (error) throw error
      // 서버에서 계정이 지워졌으니 로컬 세션도 정리
      await supabase.auth.signOut({ scope: 'local' })
    },

    onAuthStateChange(cb) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        // 콜백 안에서 Supabase 호출을 await 하면 데드락 위험 — 다음 틱으로 미룬다
        setTimeout(() => {
          toAuthUser(supabase, session?.user).then(cb)
        }, 0)
      })
      return () => data.subscription.unsubscribe()
    },
  }
}
