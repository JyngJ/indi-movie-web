'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Heart, UserRound } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { LoginPanel } from '@/components/auth/LoginPanel'
import { MyPageShell } from '@/components/auth/MyPageShell'
import { MenuCard, MenuRow } from '@/components/primitives'
import { Avatar } from '@/components/primitives'
import { useFavorites } from '@/hooks/useFavorites'

/**
 * 내 계정 탭 홈 (IA 28).
 * 비로그인: 탭 홈 자체가 로그인 화면 (별도 시트 없음).
 * 로그인: 프로필 헤더 + 메뉴. P2 관심 목록·P3 알림 설정은 그 단계에서 행 추가.
 */
export default function MyPage() {
  return (
    <Suspense fallback={null}>
      <MyPageInner />
    </Suspense>
  )
}

function MyPageInner() {
  const { status, user } = useAuth()
  const { favorites } = useFavorites()
  const favMovieCount = favorites.filter((f) => f.type === 'movie').length
  const favTheaterCount = favorites.filter((f) => f.type === 'theater').length
  const favDirectorCount = favorites.filter((f) => f.type === 'director').length
  const params = useSearchParams()
  const authError = params.get('auth_error')

  return (
    <MyPageShell title="내 계정">
      {status === 'loading' && (
        <p style={{ margin: '24px 16px', fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>확인 중…</p>
      )}

      {status === 'signed-out' && (
        <div style={{ padding: '32px 16px' }}>
          <LoginPanel returnTo="/my" errorCode={authError} />
        </div>
      )}

      {status === 'signed-in' && user && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, marginTop: 8 }}>
            <Avatar name={user.displayName ?? '사용자'} photoUrl={user.avatarUrl} size={56} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
              <span style={{ fontSize: 'var(--text-h2)', fontWeight: 700, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.displayName ?? '이름 없음'}
              </span>
              {user.email && (
                <span style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>{user.email}</span>
              )}
            </div>
          </div>

          <MenuCard>
            <MenuRow
              icon={<Heart size={17} strokeWidth={1.75} />}
              title="관심 목록"
              description={favMovieCount + favTheaterCount + favDirectorCount > 0 ? `영화 ${favMovieCount} · 극장 ${favTheaterCount} · 감독 ${favDirectorCount}` : '하트를 눌러 영화·극장·감독을 모아보세요'}
              href="/my/favorites"
              last
            />
          </MenuCard>

          <MenuCard>
            <MenuRow
              icon={<UserRound size={17} strokeWidth={1.75} />}
              title="프로필 · 계정 관리"
              description="닉네임 수정 · 연결된 계정 · 로그아웃"
              href="/my/profile"
              last
            />
          </MenuCard>
        </>
      )}
    </MyPageShell>
  )
}
