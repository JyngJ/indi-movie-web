'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { GlobalNav } from '@/components/navigation/GlobalNav'
import { SettingsPanel } from '@/components/map/SettingsPanel'
import { useUIStore } from '@/store/uiStore'
import { useIsDesktopLayout } from '@/hooks/useIsDesktopLayout'
import { OnboardingGate } from '@/components/domain/onboarding/OnboardingGate'
import { SurveyGate } from '@/components/domain/survey/SurveyGate'

const MapView = dynamic(() => import('@/components/map/MapView'), { ssr: false })

export default function TabsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  // 홈('/')은 상영작, 지도는 '/map' — 랜딩 실험(상영작 랜딩 승) 결과를 라우트로 확정한 구조.
  const isOnMap = pathname === '/map'
  const settingsOpen = useUIStore((s) => s.isSettingsOpen)
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen)
  const settingsInitialPage = useUIStore((s) => s.settingsInitialPage)
  const isDesktopLayout = useIsDesktopLayout()

  // MapView는 지도 탭을 처음 방문한 뒤 계속 mount 상태 유지 (상태 보존)
  // 항상 false로 시작해 서버/클라이언트 첫 렌더를 일치시키고, mount 후 effect에서 켠다 (hydration mismatch 방지)
  const [mapMounted, setMapMounted] = useState(false)

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

      {/* 탭 콘텐츠. 지도 경로에서도 렌더해야 한다 — /map 페이지는 화면에 그릴 UI가 없고
          크롤러용 sr-only 본문만 반환한다. 여기서 걸러내면 /map의 서버 HTML이
          통째로 비어 h1도 본문도 없는 페이지가 된다(Bing URL 검사에서 확인). */}
      {children}

      {/* 설정 팝업 — 지도 탭 외에서도 열릴 수 있도록 layout 레벨에서 렌더 */}
      {!isOnMap && (
        <SettingsPanel
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          isDesktopLayout={isDesktopLayout}
          initialPage={settingsInitialPage}
        />
      )}

      {/* 첫 방문 온보딩 — 플래그(onboarding_seen_v1) 확인 후에만 오버레이. 카탈로그 로딩은 뒤에서 계속 진행 */}
      <OnboardingGate />

      {/* 재방문자 피드백 설문 — 2회차 이상 방문 + 미응답일 때만 15초 뒤 노출 */}
      <SurveyGate />
    </>
  )
}
