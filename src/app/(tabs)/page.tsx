'use client'

import dynamic from 'next/dynamic'

// Leaflet은 window에 의존 — SSR 비활성화
const MapView = dynamic(() => import('@/components/map/MapView'), { ssr: false })

export default function Home() {
  return <MapView />
}
