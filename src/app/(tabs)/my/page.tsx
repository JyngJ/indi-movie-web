'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { GLOBAL_NAV_DESKTOP_WIDTH, GLOBAL_NAV_MOBILE_HEIGHT } from '@/components/navigation/GlobalNav'
import { Avatar, Button } from '@/components/primitives'
import { useIsDesktopLayout } from '@/hooks/useIsDesktopLayout'

/**
 * 내 계정 탭 — P1 1-a 최소 뼈대.
 * 로그인/세션 유지/로그아웃 검증용. 레이아웃·카피·4탭 내비는 1-b(feature/nav-4tabs)에서 채운다.
 */
export default function MyPage() {
  return (
    <Suspense fallback={null}>
      <MyPageInner />
    </Suspense>
  )
}

function MyPageInner() {
  const isDesktop = useIsDesktopLayout()
  const { status, user, signIn, signOut } = useAuth()
  const params = useSearchParams()
  const authError = params.get('auth_error')
  const [busy, setBusy] = useState(false)

  const handleSignIn = async () => {
    setBusy(true)
    try {
      await signIn('kakao', '/my')
    } catch {
      setBusy(false)
    }
  }

  const handleSignOut = async () => {
    setBusy(true)
    try {
      await signOut()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        minHeight: '100dvh',
        padding: 'var(--gutter)',
        paddingLeft: isDesktop ? `calc(${GLOBAL_NAV_DESKTOP_WIDTH}px + var(--gutter))` : 'var(--gutter)',
        paddingBottom: isDesktop
          ? 'var(--gutter)'
          : `calc(${GLOBAL_NAV_MOBILE_HEIGHT}px + env(safe-area-inset-bottom) + var(--gutter))`,
        backgroundColor: 'var(--color-surface-bg)',
      }}
    >
      <h1 style={{ fontSize: 'var(--text-h2)', fontWeight: 700, color: 'var(--color-text-primary)' }}>내 계정</h1>

      {authError && (
        <p role="alert" style={{ fontSize: 'var(--text-meta)', color: 'var(--color-error)' }}>
          로그인에 실패했어요. 다시 시도해 주세요. ({authError})
        </p>
      )}

      {status === 'loading' && (
        <p style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>확인 중…</p>
      )}

      {status === 'signed-out' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 360 }}>
          <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-text-secondary)' }}>
            로그인하면 관심 영화·극장을 저장하고 새 상영 소식을 받아볼 수 있어요.
          </p>
          <Button variant="primary" size="full" onClick={handleSignIn} loading={busy}>
            카카오로 시작하기
          </Button>
        </section>
      )}

      {status === 'signed-in' && user && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 360 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar name={user.displayName ?? '사용자'} photoUrl={user.avatarUrl} size={48} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 'var(--text-body)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {user.displayName ?? '이름 없음'}
              </span>
              <span style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>
                {user.email ?? '이메일 미제공'} · {user.providers.join(', ') || '—'}
              </span>
            </div>
          </div>
          <Button variant="tertiary" size="md" onClick={handleSignOut} loading={busy}>
            로그아웃
          </Button>
        </section>
      )}
    </div>
  )
}
