'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { useEffect, useState } from 'react'
import { useIsDesktopLayout } from '@/hooks/useIsDesktopLayout'
import { useUIStore } from '@/store/uiStore'
import { Icon, type IconName } from '@/components/primitives'
import { useNotificationEvents } from '@/hooks/useNotifications'

/** §5 바텀 탭바 표준 높이(safe-area 포함) — 다른 화면 요소가 이 값만큼 비켜야 함 */
export const GLOBAL_NAV_MOBILE_HEIGHT = 64
/** §5 아이콘 레일 표준 폭 */
export const GLOBAL_NAV_DESKTOP_WIDTH = 64

const ACTIVE_COLOR = 'var(--color-primary-base)'
const INACTIVE_COLOR = 'var(--color-neutral-400, #A7A19A)'   /* fallback도 2.0 값 — 구 #A9A39A는 1.0 잔재 */





/** 안 읽은 소식 배지 — 아이콘 우상단 작은 점. 숫자는 넣지 않는다(레일 폭 21px 아이콘에 안 들어간다) */
function UnreadDot() {
  return (
    <span
      aria-hidden
      style={{
        position: 'absolute', top: -2, right: -3,
        width: 8, height: 8, borderRadius: '50%',
        background: 'var(--color-error-mid)',
        border: '1.5px solid var(--color-surface-card)',
      }}
    />
  )
}

interface MobileTab {
  key: string
  href: string
  label: string
  icon: IconName
}

// 홈('/')은 상영작 탭 — 진입점이 상영작으로 바뀌면서 지도는 '/map'으로 내려갔다.
// 2026-08-17 IA 개정(피그마 IA 통합 보드 47): 지도 / 상영작 / 소식(/feed) / MY(/my).
// 설정은 탭에서 빠짐 — 모바일은 MY 우상단 ⚙ → /more, 데스크톱은 ⚙ → 설정 패널.
const MOBILE_TABS: MobileTab[] = [
  { key: 'map', href: '/map', label: '지도', icon: 'map' },
  { key: 'films', href: '/', label: '상영작', icon: 'clapperboard' },
  { key: 'feed', href: '/feed', label: '소식', icon: 'bell' },
  { key: 'my', href: '/my', label: 'MY', icon: 'user-round' },
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
  const { unreadCount } = useNotificationEvents()
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
      {tabs.map(({ key, href, label, icon }) => {
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
              <span style={{ position: 'relative', display: 'flex' }}>
                <Icon name={icon} size={23} />
                {key === 'feed' && unreadCount > 0 && <UnreadDot />}
              </span>
              <span style={{ position: 'relative', fontSize: 'var(--text-badge)', fontWeight: 600, lineHeight: 1 }}>{label}</span>
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

function DesktopRail({ pathname, filmsHref }: { pathname: string; filmsHref: string }) {
  const { unreadCount } = useNotificationEvents()
  const isSearchOpen = useUIStore((s) => s.isSearchOpen)
  const setSearchOpen = useUIStore((s) => s.setSearchOpen)
  const toggleMapDockCollapsed = useUIStore((s) => s.toggleMapDockCollapsed)

  const isFeedOpen = useUIStore((s) => s.isFeedOpen)
  const setFeedOpen = useUIStore((s) => s.setFeedOpen)
  const isMyOpen = useUIStore((s) => s.isMyOpen)
  const setMyOpen = useUIStore((s) => s.setMyOpen)

  const renderRailTab = ({ key, href, label, icon }: MobileTab) => {
    // 검색 패널이 열려있는 동안은 라우트 탭의 활성 표시를 끈다 — 메뉴는 한 번에 하나만 선택 상태
    // 소식은 데스크톱에서 페이지 대신 패널 — 패널이 열려 있으면 활성
    // 소식·MY는 데스크톱에서 페이지 대신 팝오버 — 팝오버가 열려 있으면 활성
    const active = key === 'feed' ? isFeedOpen
      : key === 'my' ? isMyOpen
      : (!isSearchOpen && !isFeedOpen && !isMyOpen && isTabActive(pathname, key))
    const resolvedHref = key === 'films' ? filmsHref : href
    const color = active ? ACTIVE_COLOR : INACTIVE_COLOR
    return (
      <Link
        key={key}
        href={resolvedHref}
        aria-current={active ? 'page' : undefined}
        onClick={(e) => {
          if (key === 'feed' || key === 'my') {
            e.preventDefault()
            if (isSearchOpen) setSearchOpen(false)
            if (key === 'feed') setFeedOpen(!isFeedOpen)
            else setMyOpen(!isMyOpen)
            return
          }
          if (isFeedOpen) setFeedOpen(false)
          if (isMyOpen) setMyOpen(false)
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
          <span style={{ position: 'relative', display: 'flex' }}>
            <Icon name={icon} size={21} />
            {key === 'feed' && unreadCount > 0 && <UnreadDot />}
          </span>
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
