import type { AuthProvider, AuthUser } from './types'

/**
 * 인증 리포지토리 경계. UI/유즈케이스는 이 인터페이스만 본다.
 * 구현: src/lib/auth/supabaseAuthRepository.ts (브라우저)
 */
export interface AuthRepository {
  /** 현재 세션의 사용자. 없으면 null */
  getCurrentUser(): Promise<AuthUser | null>
  /** OAuth 로그인 시작 — 제공자 페이지로 이동한다 (resolve 후 페이지가 떠남) */
  signInWithProvider(provider: AuthProvider, returnTo: string): Promise<void>
  signOut(): Promise<void>
  /** 표시 이름 수정 (public.users.display_name). 반환: 갱신된 사용자 */
  updateDisplayName(displayName: string): Promise<AuthUser | null>
  /** 본인 계정 삭제 (auth.users → cascade) */
  deleteAccount(): Promise<void>
  /** 세션 변화 구독. 해제 함수 반환 */
  onAuthStateChange(cb: (user: AuthUser | null) => void): () => void
}
