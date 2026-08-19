'use client'

import type { ReactNode } from 'react'
import { GLOBAL_NAV_DESKTOP_WIDTH, GLOBAL_NAV_MOBILE_HEIGHT } from '@/components/navigation/GlobalNav'
import { SettingsHeader } from '@/components/map/SettingsPanel'
import { useIsDesktopLayout } from '@/hooks/useIsDesktopLayout'

/** 내 계정 탭 공통 셸 — 헤더(뒤로가기 옵션) + 스크롤 본문. 모바일 탭바/데스크톱 레일 회피. */
export function MyPageShell({
  title,
  onBack,
  children,
}: {
  title: string
  onBack?: () => void
  children: ReactNode
}) {
  const isDesktop = useIsDesktopLayout()
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        paddingLeft: isDesktop ? GLOBAL_NAV_DESKTOP_WIDTH : 0,
        paddingBottom: isDesktop ? 0 : `calc(${GLOBAL_NAV_MOBILE_HEIGHT}px + env(safe-area-inset-bottom))`,
        backgroundColor: 'var(--color-surface-bg)',
      }}
    >
      <SettingsHeader title={title} onBack={onBack} />
      <div style={{ flex: 1, overflowY: 'auto', width: '100%', maxWidth: 560, paddingBottom: 24 }}>{children}</div>
    </div>
  )
}
