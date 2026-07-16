'use client'

import dynamic from 'next/dynamic'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { GlobalNav } from '@/components/navigation/GlobalNav'
import { SettingsPanel } from '@/components/map/SettingsPanel'
import { useUIStore } from '@/store/uiStore'
import { useIsDark } from '@/hooks/useIsDark'
import { useThemeStore } from '@/store/themeStore'
import { useIsDesktopLayout } from '@/hooks/useIsDesktopLayout'
import { useLandingVariant } from '@/hooks/useLandingVariant'
import { trackEvent } from '@/lib/analytics/client'
import { OnboardingGate } from '@/components/domain/onboarding/OnboardingGate'

const MapView = dynamic(() => import('@/components/map/MapView'), { ssr: false })

export default function TabsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isOnMap = pathname === '/'
  const settingsOpen = useUIStore((s) => s.isSettingsOpen)
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen)
  const settingsInitialPage = useUIStore((s) => s.settingsInitialPage)
  const isDark = useIsDark()
  const { setTheme } = useThemeStore()
  const isDesktopLayout = useIsDesktopLayout()
  const variant = useLandingVariant()

  // MapView는 처음 방문 후 계속 mount 상태 유지 (상태 보존)
  // 항상 false로 시작해 서버/클라이언트 첫 렌더를 일치시키고, mount 후 effect에서 켠다 (hydration mismatch 방지)
  const [mapMounted, setMapMounted] = useState(false)

  // 최초 진입 경로만 랜딩 variant 게이트 대상 — 이후 탭 전환으로 '/'에 돌아오는 정상 흐름은
  // 이 값과 무관하게 동작해야 리다이렉트 루프(예: test arm이 지도 탭을 눌러도 films로 되돌아가는 버그)를 피한다.
  const initialPathnameRef = useRef(pathname)
  const redirectedRef = useRef(false)

  useEffect(() => {
    // 딥링크(루트가 아닌 경로)로 진입 — variant 게이트 없이 기존 동작 그대로
    if (initialPathnameRef.current !== '/') {
      if (isOnMap) setMapMounted(true)
      return
    }
    // 최초 배정/리다이렉트 판단이 이미 끝났으면 이후엔 일반 탭 전환처럼 동작
    if (redirectedRef.current) {
      if (isOnMap) setMapMounted(true)
      return
    }
    // variant가 아직 resolve되지 않았으면 대기(지도도 마운트하지 않음 — test arm에 지도 깜빡임 방지)
    if (variant === null) return

    redirectedRef.current = true
    trackEvent('landing variant assigned', { variant, initial_pathname: initialPathnameRef.current })

    if (variant === 'test') {
      router.replace('/films')
      return
    }
    setMapMounted(true)
  }, [isOnMap, variant, router])

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
          initialPage={settingsInitialPage}
        />
      )}

      {/* 첫 방문 온보딩 — 플래그(onboarding_seen_v1) 확인 후에만 오버레이. 지도·카탈로그 로딩은 뒤에서 계속 진행 */}
      <OnboardingGate variant={variant} />
    </>
  )
}
