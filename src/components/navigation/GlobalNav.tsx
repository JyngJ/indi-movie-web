'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { useEffect, useState } from 'react'
import { useIsDesktopLayout } from '@/hooks/useIsDesktopLayout'
import { useUIStore } from '@/store/uiStore'

/** §5 바텀 탭바 표준 높이(safe-area 포함) — 다른 화면 요소가 이 값만큼 비켜야 함 */
export const GLOBAL_NAV_MOBILE_HEIGHT = 64
/** §5 아이콘 레일 표준 폭 */
export const GLOBAL_NAV_DESKTOP_WIDTH = 64

const ACTIVE_COLOR = 'var(--color-primary-base)'
const INACTIVE_COLOR = 'var(--color-neutral-400, #A7A19A)'   /* fallback도 2.0 값 — 구 #A9A39A는 1.0 잔재 */

function IconMap({ size = 23 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2Z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  )
}

function IconFilm({ size = 23 }: { size?: number }) {
  /* 2.0: 필름 스트립 → 클래퍼보드 — "영화를 본다"는 행위에 더 직관적 (Lucide clapperboard) */
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z" />
      <path d="m6.2 5.3 3.1 3.9" />
      <path d="m12.4 3.4 3.1 4" />
      <path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    </svg>
  )
}

function IconBell({ size = 23 }: { size?: number }) {
  /* Lucide bell — 소식 탭 */
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  )
}

function IconUser({ size = 23 }: { size?: number }) {
  /* Lucide user-round — 내 계정 탭 */
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="5" />
      <path d="M20 21a8 8 0 0 0-16 0" />
    </svg>
  )
}

interface MobileTab {
  key: string
  href: string
  label: string
  Icon: (props: { size?: number }) => React.JSX.Element
}

// 홈('/')은 상영작 탭 — 진입점이 상영작으로 바뀌면서 지도는 '/map'으로 내려갔다.
// 2026-08-17 IA 개정(피그마 IA 통합 보드 47): 지도 / 상영작 / 소식(/feed) / MY(/my).
// 설정은 탭에서 빠짐 — 모바일은 MY 우상단 ⚙ → /more, 데스크톱은 ⚙ → 설정 패널.
const MOBILE_TABS: MobileTab[] = [
  { key: 'map', href: '/map', label: '지도', Icon: IconMap },
  { key: 'films', href: '/', label: '상영작', Icon: IconFilm },
  { key: 'feed', href: '/feed', label: '소식', Icon: IconBell },
  { key: 'my', href: '/my', label: 'MY', Icon: IconUser },
]

/** 데스크톱 레일 — 위: 지도·상영작 / 아래(디바이더 밑): 소식·MY */
const DESKTOP_RAIL_TOP = MOBILE_TABS.filter((tab) => tab.key === 'map' || tab.key === 'films')
const DESKTOP_RAIL_BOTTOM = MOBILE_TABS.filter((tab) => tab.key === 'feed' || tab.key === 'my')

/** 탭 활성 판정은 key 기준 — 상영작 탭은 홈('/')과 구 경로('/films/*') 양쪽을 모두 자기 영역으로 본다 */
function isTabActive(pathname: string, key: string): boolean {
  if (key === 'map') return pathname === '/map'
  if (key === 'films') return pathname === '/' || pathname === '/films' || pathname.startsWith('/films/')
  if (key === 'feed') return pathname === '/feed' || pathname.startsWith('/feed/')
  if (key === 'my') return pathname === '/my' || pathname.startsWith('/my/')
  return pathname === '/more' || pathname.startsWith('/more/')
}

function MobileTabBar({ pathname, filmsHref }: { pathname: string; filmsHref: string }) {
  const tabs = MOBILE_TABS.map((t) => (t.key === 'films' ? { ...t, href: filmsHref } : t))
  return (
    <nav
      aria-label="주요 메뉴"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        height: `calc(${GLOBAL_NAV_MOBILE_HEIGHT}px + env(safe-area-inset-bottom))`,
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'var(--spacing-8)', paddingRight: 'var(--spacing-8)',   /* 32 — 4탭 (구 3탭은 48) */
        display: 'flex',
        alignItems: 'center',
        background: 'var(--color-surface-card)',
        borderTop: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-sm)',   /* PC 패널과 동일 스타일로 통일 */
        zIndex: 1150,
      }}
    >
      {tabs.map(({ key, href, label, Icon }) => {
        const active = isTabActive(pathname, key)
        const color = active ? ACTIVE_COLOR : INACTIVE_COLOR
        return (
          <Link
            key={key}
            href={href}
            aria-current={active ? 'page' : undefined}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
            }}
          >
            {/* 데스크톱 레일과 동일한 선택 문법 — 틴트 pill이 활성 탭을 따라 미끄러진다 */}
            <span style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              minWidth: 52,   /* 아이콘+짧은 라벨도 정사각형에 가깝게 (피그마 51×53) */
              padding: '8px var(--gutter-md)',
              borderRadius: 8,
              color,
              transition: 'color 150ms ease',
            }}>
              {active && (
                <motion.span
                  layoutId="mobile-nav-pill"
                  transition={{ type: 'spring', duration: 0.4, bounce: 0.2 }}
                  style={{
                    position: 'absolute', inset: 0, borderRadius: 8,
                    background: 'color-mix(in srgb, var(--color-primary-base) 11%, transparent)',
                  }}
                />
              )}
              <span style={{ position: 'relative', display: 'flex' }}><Icon size={23} /></span>
              <span style={{ position: 'relative', fontSize: 'var(--text-badge)', fontWeight: 600, lineHeight: 1 }}>{label}</span>
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

function DesktopRail({ pathname, filmsHref }: { pathname: string; filmsHref: string }) {
  const isSearchOpen = useUIStore((s) => s.isSearchOpen)
  const setSearchOpen = useUIStore((s) => s.setSearchOpen)
  const toggleMapDockCollapsed = useUIStore((s) => s.toggleMapDockCollapsed)

  const isFeedOpen = useUIStore((s) => s.isFeedOpen)
  const setFeedOpen = useUIStore((s) => s.setFeedOpen)

  const renderRailTab = ({ key, href, label, Icon }: MobileTab) => {
    // 검색 패널이 열려있는 동안은 라우트 탭의 활성 표시를 끈다 — 메뉴는 한 번에 하나만 선택 상태
    // 소식은 데스크톱에서 페이지 대신 패널 — 패널이 열려 있으면 활성
    const active = key === 'feed' ? isFeedOpen : (!isSearchOpen && !isFeedOpen && isTabActive(pathname, key))
    const resolvedHref = key === 'films' ? filmsHref : href
    const color = active ? ACTIVE_COLOR : INACTIVE_COLOR
    return (
      <Link
        key={key}
        href={resolvedHref}
        aria-current={active ? 'page' : undefined}
        onClick={(e) => {
          if (key === 'feed') {
            e.preventDefault()
            if (isSearchOpen) setSearchOpen(false)
            setFeedOpen(!isFeedOpen)
            return
          }
          if (isFeedOpen) setFeedOpen(false)
          if (isSearchOpen) {
            setSearchOpen(false)
            return
          }
          // 지도 화면에서 '지도' 탭 재클릭 — 좌측 도크를 슬라이드 토글 (검색 오버레이 중엔 제외, 위에서 처리)
          if (key === 'map' && pathname === '/map') toggleMapDockCollapsed()
        }}
        style={{ textDecoration: 'none' }}
      >
        <div
          className={active ? undefined : 'hover-card'}
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            padding: '8px 4px',
            margin: '0 8px',
            borderRadius: 8,
            color,
            transition: 'color 150ms ease',
          }}
        >
          {/* 활성 틴트 — 슬라이드(layoutId) 대신 각자 페이드 인/아웃 (2026-08-17 사용자 결정) */}
          <AnimatePresence initial={false}>
            {active && (
              <motion.span
                key="rail-pill"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                style={{
                  position: 'absolute', inset: 0, borderRadius: 8,
                  background: 'color-mix(in srgb, var(--color-primary-base) 11%, transparent)',
                }}
              />
            )}
          </AnimatePresence>
          <span style={{ position: 'relative', display: 'flex' }}><Icon size={21} /></span>
          <span style={{ position: 'relative', fontSize: 10, fontWeight: 600 }}>{label}</span>
        </div>
      </Link>
    )
  }

  return (
    <nav
      aria-label="주요 메뉴"
      style={{
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        width: GLOBAL_NAV_DESKTOP_WIDTH,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
        paddingTop: 16,
        paddingBottom: 16,
        background: 'var(--color-surface-raised)',   /* 피그마 rail: neutral/200 — 패널보다 한 단 가라앉힘 */
        zIndex: 1150,
      }}
    >
      <Link href="/" aria-label="홈(상영작)" style={{ display: 'block' }}>
        <Image src="/logo-tile.png" alt="영화볼지도 로고" width={40} height={40} style={{ borderRadius: 4 }} />
      </Link>

      {/* 위: 지도 - 상영작 (검색은 지도 상단 검색창으로 진입 — 레일 탭 제거) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
        {DESKTOP_RAIL_TOP.map(renderRailTab)}
      </div>

      {/* 아래: 디바이더 - 소식 - MY. 신고·인스타·설정 버튼은 MY ⚙(설정 패널)로 이동 (2026-08-17 IA) */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
        {/* 위 그룹과 같은 stretch — alignItems: center를 주면 탭이 hug 폭으로 줄어 호버 면이 좁아진다 */}
        <div style={{ width: 'calc(100% - 16px)', height: 1, margin: '0 auto', background: 'var(--color-neutral-300)' }} />
        {DESKTOP_RAIL_BOTTOM.map(renderRailTab)}
      </div>
    </nav>
  )
}

const FILMS_LAST_PATH_KEY = 'lastFilmsPath'
const PREV_PATH_KEY = 'yh_prev_path'
const CUR_PATH_KEY = 'yh_cur_path'

/** 직전 pathname — 상세 뒤로가기가 브라우저 히스토리 대신 흐름 기준으로 판단할 때 사용 */
export function getPrevPathname(): string | null {
  try { return sessionStorage.getItem(PREV_PATH_KEY) } catch { return null }
}

/** 글로벌 네비게이션 — 모바일: 하단 탭바(지도·상영작·소식·MY), 데스크톱: 좌측 아이콘 레일(지도·상영작 | 소식·MY) */
export function GlobalNav() {
  const isDesktop = useIsDesktopLayout()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [filmsHref, setFilmsHref] = useState('/')

  useEffect(() => {
    setMounted(true)
    const stored = sessionStorage.getItem(FILMS_LAST_PATH_KEY)
    if (stored) setFilmsHref(stored)
  }, [])

  useEffect(() => {
    if (!mounted) return
    // /films/area/*는 검색 유입용 SEO 랜딩 — 탭 상태가 아니므로 복원 대상에서 제외
    // (랜딩 → 지도 CTA → 상영작 탭을 누르면 랜딩으로 돌아가버리는 문제 방지)
    // 상영작 탭 루트는 '/'이고 상세는 여전히 '/films/*' 아래에 있다.
    if (pathname === '/' || (pathname.startsWith('/films') && !pathname.startsWith('/films/area'))) {
      sessionStorage.setItem(FILMS_LAST_PATH_KEY, pathname)
      setFilmsHref(pathname)
    }
    // 직전 경로 기록 — GlobalNav는 탭·상세 전부에서 렌더되므로 전역 추적 지점으로 적합
    try {
      const cur = sessionStorage.getItem(CUR_PATH_KEY)
      if (cur !== pathname) {
        if (cur) sessionStorage.setItem(PREV_PATH_KEY, cur)
        sessionStorage.setItem(CUR_PATH_KEY, pathname)
      }
    } catch { /* sessionStorage 불가 환경 무시 */ }
  }, [pathname, mounted])

  if (!mounted) return null
  return isDesktop
    ? <DesktopRail pathname={pathname} filmsHref={filmsHref} />
    : <MobileTabBar pathname={pathname} filmsHref={filmsHref} />
}
