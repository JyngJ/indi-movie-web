'use client'

import { GLOBAL_NAV_DESKTOP_WIDTH, GLOBAL_NAV_MOBILE_HEIGHT } from '@/components/navigation/GlobalNav'
import { useIsDesktopLayout } from '@/hooks/useIsDesktopLayout'

// P1 빈 셸 — 와이어프레임은 P3(feat/films-wireframe)에서 채움
export default function FilmsPage() {
  const isDesktop = useIsDesktopLayout()

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        paddingBottom: isDesktop ? 0 : `calc(${GLOBAL_NAV_MOBILE_HEIGHT}px + env(safe-area-inset-bottom))`,
        paddingLeft: isDesktop ? GLOBAL_NAV_DESKTOP_WIDTH : 0,
        color: 'var(--color-text-caption)',
        fontSize: 14,
      }}
    >
      영화 탭 — 준비 중
    </div>
  )
}
