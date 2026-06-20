'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { GlobalNav } from '@/components/navigation/GlobalNav'
import { SettingsPanel } from '@/components/map/SettingsPanel'
import { useUIStore } from '@/store/uiStore'
import { useIsDark } from '@/hooks/useIsDark'
import { useThemeStore } from '@/store/themeStore'
import { useIsDesktopLayout } from '@/hooks/useIsDesktopLayout'

const MapView = dynamic(() => import('@/components/map/MapView'), { ssr: false })

export default function TabsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isOnMap = pathname === '/'
  const settingsOpen = useUIStore((s) => s.isSettingsOpen)
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen)
  const isDark = useIsDark()
  const { setTheme } = useThemeStore()
  const isDesktopLayout = useIsDesktopLayout()

  // MapView는 처음 방문 후 계속 마운트 상태 유지 (상태 보존)
  const [mapMounted, setMapMounted] = useState(
    () => typeof window !== 'undefined' && window.location.pathname === '/',
  )
  useEffect(() => {
    if (isOnMap) setMapMounted(true)
  }, [isOnMap])

  return (
    <>
      <GlobalNav />

      {/* 지도 — 한 번 마운트 후 탭 전환 시에도 언마운트하지 않음 */}
      {mapMounted && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: isOnMap ? 0 : -1,
            visibility: isOnMap ? 'visible' : 'hidden',
            pointerEvents: isOnMap ? 'auto' : 'none',
          }}
        >
          <MapView />
        </div>
      )}

      {/* 지도 외 탭 콘텐츠 */}
      {!isOnMap && children}

      {/* 설정 팝업 — 지도 탭 외에서도 열릴 수 있도록 layout 레벨에서 렌더 */}
      {!isOnMap && (
        <SettingsPanel
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          isDesktopLayout={isDesktopLayout}
          isDark={isDark}
          onSetTheme={(theme) => void setTheme(theme)}
        />
      )}
    </>
  )
}
