/** 계정 도메인 타입 — 프레임워크·Supabase 무관 */

export type AuthProvider = 'kakao' | 'google'

/** 앱이 다루는 로그인 사용자. auth.users + public.users를 합친 표시용 뷰. */
export interface AuthUser {
  id: string
  /** 소셜 계정 이메일. 카카오는 비즈앱 아니면 없음 */
  email: string | null
  displayName: string | null
  avatarUrl: string | null
  /** 로그인에 쓴 제공자들 (같은 이메일로 여러 개 연결될 수 있음) */
  providers: AuthProvider[]
}

export const DISPLAY_NAME_MAX = 30

/** 닉네임 검증 — DB 제약(1~30자)과 동일. 반환: 정규화된 값 또는 에러 메시지 */
export function validateDisplayName(raw: string): { ok: true; value: string } | { ok: false; message: string } {
  const value = raw.trim().replace(/\s+/g, ' ')
  if (value.length === 0) return { ok: false, message: '닉네임을 입력해 주세요.' }
  if (value.length > DISPLAY_NAME_MAX) return { ok: false, message: `닉네임은 ${DISPLAY_NAME_MAX}자 이하여야 해요.` }
  return { ok: true, value }
}

/** 로그인 후 돌아갈 경로. 같은 오리진의 path만 허용 (open redirect 방지) */
export function sanitizeReturnTo(raw: string | null | undefined, fallback = '/'): string {
  if (!raw) return fallback
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return fallback
  return raw
}
