'use client'

import type { ReactNode } from 'react'
import { GlobalNav, GLOBAL_NAV_DESKTOP_WIDTH, GLOBAL_NAV_MOBILE_HEIGHT } from '@/components/navigation/GlobalNav'
import { useIsDesktopLayout } from '@/hooks/useIsDesktopLayout'

/** 상세 화면 공통 셸 — (tabs) 레이아웃 밖 상세 라우트에도 글로벌 네비를 상시 노출한다.
 *  PC: 왼쪽 레일 + 본문 최대폭 1000 중앙 / 모바일: 하단 탭바 + 그만큼 하단 패딩.
 *  상세 안의 fixed 하단 CTA는 각 화면에서 탭바 높이만큼 올려서 배치할 것. */
export function DetailShell({ children }: { children: ReactNode }) {
  const isDesktop = useIsDesktopLayout()
  return (
    <>
      <GlobalNav />
      <div
        style={{
          minHeight: '100dvh',
          paddingLeft: isDesktop ? GLOBAL_NAV_DESKTOP_WIDTH : 0,
          paddingBottom: isDesktop ? 0 : `calc(${GLOBAL_NAV_MOBILE_HEIGHT}px + env(safe-area-inset-bottom))`,
        }}
      >
        <div style={isDesktop ? { maxWidth: 1000, margin: '0 auto' } : undefined}>
          {children}
        </div>
      </div>
    </>
  )
}
