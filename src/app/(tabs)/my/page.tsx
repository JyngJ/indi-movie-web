'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { BarChart3, Bell, Clapperboard, Heart, MessageSquareText, Settings, UserRound } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { LoginPanel } from '@/components/auth/LoginPanel'
import { MyPageShell } from '@/components/auth/MyPageShell'
import { Avatar, Button, IconButton, MenuCard, MenuRow } from '@/components/primitives'
import { useFavorites } from '@/hooks/useFavorites'
import { useIsDesktopLayout } from '@/hooks/useIsDesktopLayout'
import { useUIStore } from '@/store/uiStore'

/**
 * MY 탭 홈 (IA 48, 왓챠 '나의 왓챠' 참고 — 2026-08-17 확정).
 * ⚙(설정) · 큰 아바타 · 닉네임 · [프로필 수정] → 보관함(관심 목록 / 관람 기록 P4 / 리뷰 P5 / 통계 P7) → 알림 설정 · 프로필·계정 관리.
 * 비로그인: 로그인 유도 + ⚙ 그대로 (설정은 비로그인도 진입).
 * 설정: 모바일 → /more, 데스크톱 → 설정 패널.
 */
export default function MyPage() {
  return (
    <Suspense fallback={null}>
      <MyPageInner />
    </Suspense>
  )
}

function MyPageInner() {
  const router = useRouter()
  const isDesktop = useIsDesktopLayout()
  const { status, user } = useAuth()
  const { favorites } = useFavorites()
  const params = useSearchParams()
  const authError = params.get('auth_error')
  const openSettingsPage = useUIStore((s) => s.openSettingsPage)

  const favMovie = favorites.filter((f) => f.type === 'movie').length
  const favTheater = favorites.filter((f) => f.type === 'theater').length
  const favDirector = favorites.filter((f) => f.type === 'director').length

  const openSettings = () => {
    // 렌더 시점 isDesktop이 아니라 클릭 시점 실제 뷰포트로 판단 — Suspense 지연 hydration 중엔
    // useSyncExternalStore 서버 스냅샷(false)이 핸들러에 잡혀 데스크톱에서도 /more로 가버린다.
    const desktopNow = typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : isDesktop
    if (desktopNow) openSettingsPage('main')
    else router.push('/more')
  }

  const gear = (
    <IconButton variant="ghost" size={44} aria-label="설정" onClick={openSettings}>
      <Settings size={22} strokeWidth={1.75} />
    </IconButton>
  )

  return (
    <MyPageShell title="MY" trailing={gear}>
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
          {/* 프로필 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '24px 16px' }}>
            <Avatar name={user.displayName ?? '사용자'} photoUrl={user.avatarUrl} size={88} />
            <span style={{ fontSize: 'var(--text-h1)', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.displayName ?? '이름 없음'}
            </span>
            <Link href="/my/profile" style={{ textDecoration: 'none' }}>
              <Button variant="tertiary" size="md" fullWidth>프로필 수정</Button>
            </Link>
          </div>

          <div style={{ height: 8, backgroundColor: 'var(--color-surface-raised)' }} />

          {/* 보관함 */}
          <section style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ margin: 0, fontSize: 'var(--text-h2)', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--color-text-primary)' }}>보관함</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              <ShelfItem href="/my/favorites" icon={<Heart size={24} strokeWidth={1.75} />} label="관심 목록" caption={favMovie + favTheater + favDirector > 0 ? `${favMovie + favTheater + favDirector}` : undefined} />
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
              description="카톡 알림 · 새 상영 / 막바지 / 다이제스트 (준비 중)"
              disabled
            />
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

/** 보관함 원형 아이콘 항목 — 미구현(P4~P7)은 dim + 클릭 없음 */
function ShelfItem({ href, icon, label, caption, disabled }: { href?: string; icon: React.ReactNode; label: string; caption?: string; disabled?: boolean }) {
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
  if (href && !disabled) return <Link href={href} style={{ textDecoration: 'none' }}>{inner}</Link>
  return <div aria-disabled={disabled}>{inner}</div>
}
