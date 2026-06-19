'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { GlobalNav } from '@/components/navigation/GlobalNav'

const MapView = dynamic(() => import('@/components/map/MapView'), { ssr: false })

export default function TabsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isOnMap = pathname === '/'

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
    </>
  )
}
