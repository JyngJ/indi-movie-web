'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AuthRepository } from '@/lib/auth/repository'
import type { AuthProvider as OAuthProvider, AuthUser } from '@/lib/auth/types'
import { showGlobalToast } from '@/lib/ui/globalToast'
import { identifyUser, resetAnalyticsUser, trackEvent } from '@/lib/analytics/client'
import { createSupabaseAuthRepository } from '@/lib/auth/supabaseAuthRepository'

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in'

interface AuthContextValue {
  status: AuthStatus
  user: AuthUser | null
  /** returnTo 생략 시 현재 경로로 복귀 */
  signIn: (provider: OAuthProvider, returnTo?: string) => Promise<void>
  signOut: () => Promise<void>
  updateDisplayName: (displayName: string) => Promise<void>
  deleteAccount: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const repoRef = useRef<AuthRepository | null>(null)
  const getRepo = () => (repoRef.current ??= createSupabaseAuthRepository())

  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    const repo = getRepo()
    let cancelled = false

    repo.getCurrentUser().then((u) => {
      if (cancelled) return
      setUser(u)
      setStatus(u ? 'signed-in' : 'signed-out')
      if (u) identifyUser(u.id)
    })

    const unsubscribe = repo.onAuthStateChange((u) => {
      setUser(u)
      setStatus(u ? 'signed-in' : 'signed-out')
      if (u) identifyUser(u.id)
    })

    // 카카오 콜백이 붙여준 auth_login 파라미터 — 이벤트 한 번 찍고 주소에서 지운다
    const params = new URLSearchParams(window.location.search)
    const authLogin = params.get('auth_login')
    if (authLogin === 'new' || authLogin === 'ok') {
      trackEvent(authLogin === 'new' ? 'signed up' : 'logged in', { method: 'kakao' })
      params.delete('auth_login')
      const qs = params.toString()
      window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`)
    }

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (provider: OAuthProvider, returnTo?: string) => {
    const target = returnTo ?? `${window.location.pathname}${window.location.search}`
    await getRepo().signInWithProvider(provider, target)
  }, [])

  const signOut = useCallback(async () => {
    /* repo가 폴백까지 실패해도 화면은 로그아웃돼야 한다 — 스토리지 정리 실패는
       다음 세션 검증에서 걸러진다 */
    try { await getRepo().signOut() } finally {
      setUser(null)
      setStatus('signed-out')
      resetAnalyticsUser()
      showGlobalToast('로그아웃했어요')
    }
  }, [])

  const updateDisplayName = useCallback(async (displayName: string) => {
    const next = await getRepo().updateDisplayName(displayName)
    if (next) setUser(next)
  }, [])

  const deleteAccount = useCallback(async () => {
    await getRepo().deleteAccount()
    setUser(null)
    setStatus('signed-out')
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, signIn, signOut, updateDisplayName, deleteAccount }),
    [status, user, signIn, signOut, updateDisplayName, deleteAccount],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  // writing-audit-ignore — 개발자용 오류 메시지 (화면 문구 아님)
  if (!ctx) throw new Error('useAuth는 AuthProvider 안에서만 사용할 수 있습니다.')
  return ctx
}
