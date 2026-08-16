import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { mapSupabaseUser } from './mapUser'
import type { AuthRepository } from './repository'
import type { AuthProvider, AuthUser } from './types'
import { sanitizeReturnTo } from './types'

/** OAuth 콜백 라우트. 여기서 code → session 교환 후 returnTo로 보낸다 */
export const AUTH_CALLBACK_PATH = '/auth/callback'

/**
 * 제공자별 추가 스코프. 주의: Supabase(GoTrue)는 이 값을 제공자 기본 스코프에 *덧붙이기만* 하고 빼지 못한다.
 * 카카오 기본값 = account_email profile_image profile_nickname — 셋 다 개발자 콘솔 동의항목에서 켜져 있어야
 * KOE205가 안 난다 (account_email은 비즈 앱 전환 필요). 여기선 빈 값으로 두고 콘솔 설정으로 맞춘다.
 */
const PROVIDER_SCOPES: Record<AuthProvider, string> = {
  kakao: '',
  google: '',
}

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
      const redirectTo = `${origin}${AUTH_CALLBACK_PATH}?next=${encodeURIComponent(next)}`
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo, scopes: PROVIDER_SCOPES[provider] || undefined },
      })
      if (error) throw error
    },

    async signOut() {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
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
