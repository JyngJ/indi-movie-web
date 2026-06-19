'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useIsDesktopLayout } from '@/hooks/useIsDesktopLayout'
import { useUIStore } from '@/store/uiStore'

/** §5 바텀 탭바 표준 높이(safe-area 포함) — 다른 화면 요소가 이 값만큼 비켜야 함 */
export const GLOBAL_NAV_MOBILE_HEIGHT = 60
/** §5 아이콘 레일 표준 폭 */
export const GLOBAL_NAV_DESKTOP_WIDTH = 64

const ACTIVE_COLOR = 'var(--color-primary-base)'
const INACTIVE_COLOR = 'var(--color-neutral-400, #A9A39A)'

function IconMap({ size = 23 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2Z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  )
}

function IconFilm({ size = 23 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M3 15h18M8 4v5M8 15v5M16 4v5M16 15v5" />
    </svg>
  )
}

function IconSearch({ size = 21 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  )
}

function IconSettings({ size = 21 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  )
}

interface MobileTab {
  key: string
  href: string
  label: string
  Icon: (props: { size?: number }) => React.JSX.Element
}

const MOBILE_TABS: MobileTab[] = [
  { key: 'map', href: '/', label: '지도', Icon: IconMap },
  { key: 'films', href: '/films', label: '영화', Icon: IconFilm },
  { key: 'more', href: '/more', label: '설정', Icon: IconSettings },
]

/** 데스크톱 레일 — 모바일의 '설정' 탭은 제외(레일 하단 설정 버튼이 그 내용을 대신 트리거) */
const DESKTOP_RAIL_TABS = MOBILE_TABS.filter((tab) => tab.key !== 'more')

function isTabActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
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
        display: 'flex',
        background: 'var(--color-surface-card)',
        borderTop: '1px solid var(--color-border)',
        zIndex: 1150,
      }}
    >
      {tabs.map(({ key, href, label, Icon }) => {
        const active = isTabActive(pathname, key === 'films' ? '/films' : href)
        const color = active ? ACTIVE_COLOR : INACTIVE_COLOR
        return (
          <Link
            key={key}
            href={href}
            aria-current={active ? 'page' : undefined}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              color,
              textDecoration: 'none',
            }}
          >
            <Icon size={23} />
            <span style={{ fontSize: 11, fontWeight: 600 }}>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

function DesktopRail({ pathname, filmsHref }: { pathname: string; filmsHref: string }) {
  const isSearchOpen = useUIStore((s) => s.isSearchOpen)
  const setSearchOpen = useUIStore((s) => s.setSearchOpen)
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen)
  const toggleMapDockCollapsed = useUIStore((s) => s.toggleMapDockCollapsed)
  const searchColor = isSearchOpen ? ACTIVE_COLOR : INACTIVE_COLOR

  const renderRailTab = ({ key, href, label, Icon }: MobileTab) => {
    // 검색 패널이 열려있는 동안은 라우트 탭의 활성 표시를 끈다 — 메뉴는 한 번에 하나만 선택 상태
    const active = !isSearchOpen && isTabActive(pathname, key === 'films' ? '/films' : href)
    const resolvedHref = key === 'films' ? filmsHref : href
    const color = active ? ACTIVE_COLOR : INACTIVE_COLOR
    return (
      <Link
        key={key}
        href={resolvedHref}
        aria-current={active ? 'page' : undefined}
        onClick={() => {
          if (isSearchOpen) {
            setSearchOpen(false)
            return
          }
          // 지도 화면에서 '지도' 탭 재클릭 — 좌측 도크를 슬라이드 토글 (검색 오버레이 중엔 제외, 위에서 처리)
          if (key === 'map' && pathname === '/') toggleMapDockCollapsed()
        }}
        style={{ textDecoration: 'none' }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            padding: '8px 4px',
            margin: '0 8px',
            borderRadius: 10,
            background: active ? 'color-mix(in srgb, var(--color-primary-base) 11%, transparent)' : 'transparent',
            color,
          }}
        >
          <Icon size={21} />
          <span style={{ fontSize: 10.5, fontWeight: 600 }}>{label}</span>
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
        gap: 18,
        paddingTop: 16,
        paddingBottom: 16,
        background: 'var(--color-surface-card)',
        borderRight: '1px solid var(--color-border)',
        zIndex: 1150,
      }}
    >
      <Link href="/" aria-label="지도 홈" style={{ display: 'block' }}>
        <Image src="/icon.svg" alt="" width={38} height={38} style={{ borderRadius: 11 }} />
      </Link>

      {/* 순서: 지도 - 검색 - 영화 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
        {DESKTOP_RAIL_TABS.filter((tab) => tab.key === 'map').map(renderRailTab)}

        <button
          type="button"
          onClick={() => setSearchOpen(!isSearchOpen)}
          aria-label="검색"
          aria-pressed={isSearchOpen}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            padding: '8px 4px',
            marginLeft: 8,
            marginRight: 8,
            width: 'calc(100% - 16px)',
            borderRadius: 10,
            border: 'none',
            background: isSearchOpen ? 'color-mix(in srgb, var(--color-primary-base) 11%, transparent)' : 'transparent',
            color: searchColor,
            cursor: 'pointer',
          }}
        >
          <IconSearch size={21} />
          <span style={{ fontSize: 10.5, fontWeight: 600 }}>검색</span>
        </button>

        {DESKTOP_RAIL_TABS.filter((tab) => tab.key !== 'map').map(renderRailTab)}
      </div>

      <button
        type="button"
        onClick={() => {
          if (isSearchOpen) setSearchOpen(false)
          setSettingsOpen(true)
        }}
        aria-label="설정"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          padding: '8px 4px',
          marginTop: 'auto',
          marginLeft: 8,
          marginRight: 8,
          width: 'calc(100% - 16px)',
          borderRadius: 10,
          border: 'none',
          background: 'transparent',
          color: INACTIVE_COLOR,
          cursor: 'pointer',
        }}
      >
        <IconSettings size={21} />
        <span style={{ fontSize: 10.5, fontWeight: 600 }}>설정</span>
      </button>
    </nav>
  )
}

const FILMS_LAST_PATH_KEY = 'lastFilmsPath'

/** 글로벌 네비게이션 — 모바일: 하단 탭바(지도·영화·설정), 데스크톱: 좌측 아이콘 레일 */
export function GlobalNav() {
  const isDesktop = useIsDesktopLayout()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [filmsHref, setFilmsHref] = useState('/films')

  useEffect(() => {
    setMounted(true)
    const stored = sessionStorage.getItem(FILMS_LAST_PATH_KEY)
    if (stored) setFilmsHref(stored)
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (pathname.startsWith('/films')) {
      sessionStorage.setItem(FILMS_LAST_PATH_KEY, pathname)
      setFilmsHref(pathname)
    }
  }, [pathname, mounted])

  if (!mounted) return null
  return isDesktop
    ? <DesktopRail pathname={pathname} filmsHref={filmsHref} />
    : <MobileTabBar pathname={pathname} filmsHref={filmsHref} />
}
