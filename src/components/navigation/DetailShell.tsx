'use client'

import type { ReactNode } from 'react'
import { GlobalNav, GLOBAL_NAV_DESKTOP_WIDTH, GLOBAL_NAV_MOBILE_HEIGHT } from '@/components/navigation/GlobalNav'
import { useIsDesktopLayout } from '@/hooks/useIsDesktopLayout'
import { FeedPanel } from '@/components/domain/favorites/FeedPanel'
import { MyPanel } from '@/components/auth/MyPanel'
import { SettingsPanel } from '@/components/map/SettingsPanel'
import { useUIStore } from '@/store/uiStore'

/** 상세 화면 공통 셸 — (tabs) 레이아웃 밖 상세 라우트에도 글로벌 네비를 상시 노출한다.
 *  PC: 왼쪽 레일 + 본문 패널(좌측 r16, 상영작 탭과 동일 문법). 상단 바는 패널 좌우 풀폭,
 *  본문 컬럼 폭(1000)은 각 화면이 콘텐츠에만 적용한다.
 *  모바일: 하단 탭바 + 그만큼 하단 패딩. 상세 안의 fixed 하단 CTA는 탭바 높이만큼 올릴 것. */
export function DetailShell({ children }: { children: ReactNode }) {
  const isDesktop = useIsDesktopLayout()
  const settingsOpen = useUIStore((s) => s.isSettingsOpen)
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen)
  const settingsInitialPage = useUIStore((s) => s.settingsInitialPage)
  return (
    <>
      <GlobalNav />
      {/* 데스크톱: 본문이 레일 위에 뜬 카드처럼 — 좌상/좌하 코너를 레일색으로 깎는 고정 마스크 (상영작 탭과 동일) */}
      {isDesktop && (
        <>
          <div aria-hidden style={{
            position: 'fixed', left: GLOBAL_NAV_DESKTOP_WIDTH, top: 0, width: 16, height: 16,
            background: 'radial-gradient(circle 16px at 100% 100%, transparent 98%, var(--color-surface-raised) 100%)',
            zIndex: 1100, pointerEvents: 'none',
          }} />
          <div aria-hidden style={{
            position: 'fixed', left: GLOBAL_NAV_DESKTOP_WIDTH, bottom: 0, width: 16, height: 16,
            background: 'radial-gradient(circle 16px at 100% 0%, transparent 98%, var(--color-surface-raised) 100%)',
            zIndex: 1100, pointerEvents: 'none',
          }} />
        </>
      )}
      <div
        style={{
          minHeight: '100dvh',
          paddingLeft: isDesktop ? GLOBAL_NAV_DESKTOP_WIDTH : 0,
          paddingBottom: isDesktop ? 0 : `calc(${GLOBAL_NAV_MOBILE_HEIGHT}px + env(safe-area-inset-bottom))`,
          backgroundColor: 'var(--color-surface-bg)',
        }}
      >
        {children}
      </div>

      {/* 레일 팝오버·설정 패널 — (tabs) 레이아웃에만 있어서 상세 화면에서는 소식·MY를 눌러도
          상태만 켜지고 아무것도 안 열렸다. 상세도 GlobalNav를 쓰니 여기서도 같이 렌더한다. */}
      {isDesktop && <FeedPanel />}
      {isDesktop && <MyPanel />}
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        isDesktopLayout={isDesktop}
        initialPage={settingsInitialPage}
      />
    </>
  )
}
