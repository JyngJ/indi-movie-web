'use client'

import Link from 'next/link'
import { BarChart3, Bell, Clapperboard, Heart, MessageSquareText, UserRound } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { LoginPanel } from '@/components/auth/LoginPanel'
import { Avatar, Button, MenuCard, MenuRow } from '@/components/primitives'
import { useFavorites } from '@/hooks/useFavorites'

/**
 * MY 홈 본문 (IA 48, 왓챠 '나의 왓챠' 참고) — 모바일 /my 페이지와 데스크톱 MyPanel이 공유.
 * 큰 아바타 · 닉네임 · [프로필 수정] → 보관함(관심 목록 / 관람 기록 P4 / 리뷰 P5 / 통계 P7) → 알림 설정 · 프로필·계정 관리.
 * onProfile: 프로필 편집으로 이동(모바일 → /my/profile 라우트, 데스크톱 → 팝오버 내부 페이지).
 */
export function MyHomeContent({ authError, onProfile, onNotifications, onNavigate }: {
  authError?: string | null
  onProfile: () => void
  /** 알림 설정으로 이동 — 데스크톱은 팝오버 내부 전환, 모바일은 라우트 */
  onNotifications?: () => void
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
        <LoginPanel returnTo="/my" errorCode={authError} />
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
        <Button variant="tertiary" size="md" fullWidth onClick={onProfile}>프로필 수정</Button>
      </div>

      <div style={{ height: 8, backgroundColor: 'var(--color-surface-raised)' }} />

      <section style={{ padding: '24px var(--gutter)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 'var(--text-h2)', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--color-text-primary)' }}>보관함</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          <ShelfItem href="/my/favorites" onNavigate={onNavigate} icon={<Heart size={24} strokeWidth={1.75} />} label="관심 목록" caption={favCount > 0 ? String(favCount) : undefined} />
          <ShelfItem icon={<Clapperboard size={24} strokeWidth={1.75} />} label="관람 기록" disabled />
          <ShelfItem icon={<MessageSquareText size={24} strokeWidth={1.75} />} label="리뷰" disabled />
          <ShelfItem icon={<BarChart3 size={24} strokeWidth={1.75} />} label="통계" disabled />
        </div>
      </section>

      <div style={{ height: 8, backgroundColor: 'var(--color-surface-raised)' }} />

      <MenuCard style={{ marginTop: 16 }}>
        <MenuRow
          icon={<Bell size={17} strokeWidth={1.75} />}
          title="알림 설정"
          description="새 상영 · 막바지 · 방해 금지 시간"
          {...(onNotifications ? { onClick: onNotifications } : { href: '/my/notifications' })}
        />
        <MenuRow icon={<UserRound size={17} strokeWidth={1.75} />} title="프로필 · 계정 관리" description="닉네임 수정 · 연결된 계정 · 로그아웃" onClick={onProfile} last />
      </MenuCard>
    </>
  )
}

/** 보관함 원형 아이콘 항목 — 미구현(P4~P7)은 dim + 클릭 없음 */
function ShelfItem({ href, onNavigate, icon, label, caption, disabled }: { href?: string; onNavigate?: () => void; icon: React.ReactNode; label: string; caption?: string; disabled?: boolean }) {
  const inner = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, opacity: disabled ? 0.4 : 1 }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: 'var(--color-surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-primary)', position: 'relative' }}>
        {icon}
        {caption && (
          <span style={{ position: 'absolute', top: 0, right: 0, minWidth: 18, height: 18, padding: '0 4px', borderRadius: 'var(--radius-pill)', backgroundColor: 'var(--color-primary-base)', color: 'var(--color-on-accent)', fontSize: 'var(--text-badge)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{caption}</span>
        )}
      </div>
      <span style={{ fontSize: 'var(--text-meta)', fontWeight: 500, color: 'var(--color-text-primary)', textAlign: 'center' }}>{label}{disabled ? ' (예정)' : ''}</span>
    </div>
  )
  if (href && !disabled) return <Link href={href} style={{ textDecoration: 'none' }} onClick={onNavigate}>{inner}</Link>
  return <div aria-disabled={disabled}>{inner}</div>
}
