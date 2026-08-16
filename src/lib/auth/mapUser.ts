import type { User } from '@supabase/supabase-js'
import type { AuthProvider, AuthUser } from './types'

const KNOWN_PROVIDERS: AuthProvider[] = ['kakao', 'google']

/** Supabase auth User → 앱 AuthUser. 순수 함수 (테스트 가능) */
export function mapSupabaseUser(user: User | null | undefined): AuthUser | null {
  if (!user) return null
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const str = (v: unknown) => (typeof v === 'string' && v.length > 0 ? v : null)

  const providers = (user.identities ?? [])
    .map((i) => i.provider)
    .filter((p): p is AuthProvider => (KNOWN_PROVIDERS as string[]).includes(p))

  return {
    id: user.id,
    email: user.email ?? null,
    displayName:
      str(meta.name) ?? str(meta.nickname) ?? str(meta.preferred_username) ?? str(meta.full_name),
    avatarUrl: str(meta.avatar_url) ?? str(meta.picture),
    providers,
  }
}
