'use client'

import type { ReactNode } from 'react'
import { GLOBAL_NAV_DESKTOP_WIDTH, GLOBAL_NAV_MOBILE_HEIGHT } from '@/components/navigation/GlobalNav'
import { SettingsHeader } from '@/components/map/SettingsPanel'
import { useIsDesktopLayout } from '@/hooks/useIsDesktopLayout'

/** 내 계정 탭 공통 셸 — 헤더(뒤로가기 옵션) + 스크롤 본문. 모바일 탭바/데스크톱 레일 회피. */
export function MyPageShell({
  title,
  onBack,
  trailing,
  children,
}: {
  title: string
  onBack?: () => void
  /** 헤더 우측 위젯 (⚙ 설정, "관심 목록 ›" 등) */
  trailing?: ReactNode
  children: ReactNode
}) {
  const isDesktop = useIsDesktopLayout()
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        /* height 고정 + 내부 스크롤 — minHeight면 문서가 스크롤돼 헤더가 같이 올라간다 (2026-08-24) */
        height: '100dvh',
        overflow: 'hidden',
        paddingLeft: isDesktop ? GLOBAL_NAV_DESKTOP_WIDTH : 0,
        paddingBottom: isDesktop ? 0 : `calc(${GLOBAL_NAV_MOBILE_HEIGHT}px + env(safe-area-inset-bottom))`,
        backgroundColor: 'var(--color-surface-bg)',
      }}
    >
      <SettingsHeader title={title} onBack={onBack} trailing={trailing} />
      {/* 데스크톱: 본문 컬럼(560)을 가운데 — 상영작 섹션과 동일 문법. 모바일은 풀폭 */}
      {/* 스크롤 컨테이너는 block이어야 한다 — flex column이면 자식들이 flex-shrink로
          찌그러져 스크롤 대신 행이 잘린다 (2026-08-24). 세로 채움이 필요한 자식은
          minHeight:'100%'를 스스로 쓴다. */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', width: '100%', maxWidth: 560, margin: isDesktop ? '0 auto' : 0, paddingBottom: 24 }}>{children}</div>
    </div>
  )
}
