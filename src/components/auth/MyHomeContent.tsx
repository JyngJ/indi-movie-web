'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, CircleAlert, CircleHelp, Heart, UserRound } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { LoginPanel } from '@/components/auth/LoginPanel'
import { Avatar, Button, MenuCard, MenuRow } from '@/components/primitives'
import { useFavorites } from '@/hooks/useFavorites'
import { useUIStore } from '@/store/uiStore'

/**
 * MY 홈 본문 (IA 48, 왓챠 '나의 왓챠' 참고) — 모바일 /my 페이지와 데스크톱 MyPanel이 공유.
 * 큰 아바타 · 닉네임 → 메뉴(내 관심 목록 · 알림 설정 · 프로필·계정 관리)
 * → 더보기 그룹(자주 묻는 질문 · 버그 리포트 · 인스타그램, 2026-08-24 이식 —
 *   미트볼(⋯) 뒤에 숨어 있어 발견이 안 됐다. 성격이 달라 별도 카드로 나눈다).
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
  const router = useRouter()
  const openSettingsPage = useUIStore((s) => s.openSettingsPage)

  const countOf = (type: 'movie' | 'director' | 'theater') => favorites.filter((f) => f.type === type).length

  const openAttribution = () => {
    const desktopNow = typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
    if (desktopNow) {
      onNavigate?.()
      openSettingsPage('attribution')
    } else {
      router.push('/more?page=attribution')
    }
  }

  const openBugReport = () => {
    // 클릭 시점 실제 뷰포트로 판단 — hydration 지연 중 서버 스냅샷 오판 방지 (my/page.tsx와 같은 이유)
    const desktopNow = typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
    if (desktopNow) {
      onNavigate?.()
      openSettingsPage('report')
    } else {
      router.push('/more?page=report')
    }
  }

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
      </div>

      <div style={{ height: 8, backgroundColor: 'var(--color-surface-raised)' }} />

      <MenuCard style={{ marginTop: 16 }}>
        <MenuRow
          icon={<Heart size={17} strokeWidth={1.75} />}
          title="내 관심 목록"
          description={
            <>
              관심 영화 <Num n={countOf('movie')} />, 관심 감독 <Num n={countOf('director')} />, 관심 영화관 <Num n={countOf('theater')} />
            </>
          }
          {...(onFavorites ? { onClick: onFavorites } : { href: '/my/favorites' })}
        />
        <MenuRow
          icon={<Bell size={17} strokeWidth={1.75} />}
          title="알림 설정"
          description="새 상영 · 막바지 상영"
          {...(onNotifications ? { onClick: onNotifications } : { href: '/my/notifications' })}
        />
        <MenuRow icon={<UserRound size={17} strokeWidth={1.75} />} title="프로필 · 계정 관리" description="닉네임 수정 · 연결된 계정 · 로그아웃" onClick={onProfile} last />
      </MenuCard>

      <MenuCard style={{ marginTop: 16 }}>
        <MenuRow
          icon={<CircleHelp size={17} strokeWidth={1.75} />}
          title="자주 묻는 질문"
          description="서비스 소개와 이용 안내"
          href="/faq"
          onClick={onNavigate}
        />
        <MenuRow
          icon={<CircleAlert size={17} strokeWidth={1.75} />}
          title="버그 리포트"
          description="오류·깨짐을 알려주세요"
          onClick={openBugReport}
        />
        <MenuRow
          icon={
            /* lucide 구버전에 Instagram이 없다 — SettingsPanel과 같은 인라인 아이콘 */
            <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" /></svg>
          }
          title="인스타그램"
          description="@indi.movie.map — 상영 소식·큐레이션"
          href="https://www.instagram.com/indi.movie.map/"
          external
          last
        />
      </MenuCard>

      {/* 푸터 — 미트볼(⋯) 삭제로 더보기 화면에 있던 출처·개인정보·버전이 여기로 (2026-08-24) */}
      <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '0 var(--gutter)' }}>
        <Button variant="ghost" size="sm" onClick={openAttribution} style={{ color: 'var(--color-text-sub)', fontWeight: 500 }}>
          출처 표기 정보
        </Button>
        <span style={{ color: 'var(--color-text-placeholder)' }}>·</span>
        <Link
          href="/privacy"
          className="hover-raise"
          style={{ display: 'inline-flex', alignItems: 'center', height: 'var(--comp-btn-h-sm)', padding: '0 var(--comp-btn-px-sm)', fontSize: 'var(--text-meta)', color: 'var(--color-text-sub)', textDecoration: 'none', borderRadius: 'var(--radius-control)' }}
        >
          개인정보 처리방침
        </Link>
      </div>
      <div style={{ textAlign: 'center', marginTop: 8, fontSize: 'var(--text-badge)', color: 'var(--color-text-placeholder)' }}>
        영화볼지도 · v0.1.0
      </div>
    </>
  )
}

/** 관심 개수 강조 — 숫자만 프라이머리·볼드 */
function Num({ n }: { n: number }) {
  return <span style={{ color: 'var(--color-primary-base)', fontWeight: 700 }}>{n}</span>
}
