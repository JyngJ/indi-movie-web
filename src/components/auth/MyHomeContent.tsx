'use client'

import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthProvider'
import { LoginPanel } from '@/components/auth/LoginPanel'
import { Avatar, MenuCard, MenuRow } from '@/components/primitives'
import { useFavorites } from '@/hooks/useFavorites'
import { Icon } from '@/components/primitives'

/**
 * MY 홈 본문 (IA 48, 왓챠 '나의 왓챠' 참고) — 모바일 /my 페이지와 데스크톱 MyPanel이 공유.
 * 큰 아바타 · 닉네임 → 메뉴(내 관심 목록 · 알림 설정 · 프로필·계정 관리).
 * [프로필 수정] 버튼은 뺐다(2026-08-20) — 바로 아래 '프로필 · 계정 관리' 행과 같은 곳으로 가는
 * 중복 입구였다.
 * 보관함 4타일(관람 기록 P4 / 리뷰 P5 / 통계 P7)은 2026-08-20에 걷어냈다 — 네 칸 중 셋이
 * dim된 빈 자리라 "안 되는 게 많은 화면"으로 읽혔다. 실제로 열리는 것만 행으로 둔다.
 * onProfile: 프로필 편집으로 이동(모바일 → /my/profile 라우트, 데스크톱 → 팝오버 내부 페이지).
 */
export function MyHomeContent({ authError, onProfile, onNotifications, onFavorites, onNavigate }: {
  authError?: string | null
  onProfile: () => void
  /** 알림 설정으로 이동 — 데스크톱은 팝오버 내부 전환, 모바일은 라우트 */
  onNotifications?: () => void
  /** 관심 목록으로 이동 — 데스크톱은 팝오버 내부 전환, 모바일은 라우트 */
  onFavorites?: () => void
  onNavigate?: () => void
}) {
  const { status, user } = useAuth()
  const { favorites } = useFavorites()
  const favCount = favorites.length

  if (status === 'loading') {
    return <p style={{ margin: '24px var(--gutter)', fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>확인 중…</p>
  }
  if (status === 'signed-out' || !user) {
    return (
      <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '32px var(--gutter)' }}>
        <LoginPanel returnTo="/my" illustration={false} errorCode={authError} />
      </div>
    )
  }
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '24px var(--gutter)' }}>
        <Avatar name={user.displayName ?? '사용자'} photoUrl={user.avatarUrl} size={88} />
        <span style={{ fontSize: 'var(--text-h1)', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.displayName ?? '이름 없음'}
        </span>
      </div>

      <div style={{ height: 8, backgroundColor: 'var(--color-surface-raised)' }} />

      <MenuCard style={{ marginTop: 16 }}>
        <MenuRow
          icon={<Icon name="heart" size={17} strokeWidth={1.75} />}
          title="내 관심 목록"
          description={favCount > 0 ? `관심 영화, 관심 감독, 관심 영화관 ${favCount}개` : '관심 영화, 관심 감독, 관심 영화관 보기'}
          {...(onFavorites ? { onClick: onFavorites } : { href: '/my/favorites' })}
        />
        <MenuRow
          icon={<Icon name="bell" size={17} strokeWidth={1.75} />}
          title="알림 설정"
          description="새 상영 · 막바지 · 방해 금지 시간"
          {...(onNotifications ? { onClick: onNotifications } : { href: '/my/notifications' })}
        />
        <MenuRow icon={<Icon name="user-round" size={17} strokeWidth={1.75} />} title="프로필 · 계정 관리" description="닉네임 수정 · 연결된 계정 · 로그아웃" onClick={onProfile} last />
      </MenuCard>
    </>
  )
}

