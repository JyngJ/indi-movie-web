'use client'

import 'leaflet/dist/leaflet.css'
import { useRef, useState } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import type { Map as LeafletMap } from 'leaflet'
import { useUserLocation } from '@/hooks/useUserLocation'
import { SearchBar } from '@/components/primitives'
import { FabRound } from '@/components/primitives'

/* ── 아이콘 ─────────────────────────────────────────────────────── */
const IcoPlus = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
)

const IcoMinus = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <path d="M5 12h14" />
  </svg>
)

const IcoLocate = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <circle cx={12} cy={12} r={4} />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
  </svg>
)

/* ── 지도 컨트롤러 — useMap은 MapContainer 안에서만 사용 가능 ── */
function MapController({ mapRef }: { mapRef: React.MutableRefObject<LeafletMap | null> }) {
  const map = useMap()
  mapRef.current = map
  return null
}

/* ── 메인 컴포넌트 ──────────────────────────────────────────────── */
export default function MapView() {
  const { coords, refetch } = useUserLocation()
  const mapRef = useRef<LeafletMap | null>(null)
  const [search, setSearch] = useState('')

  const defaultCenter: [number, number] = coords
    ? [coords.lat, coords.lng]
    : [37.5665, 126.978] // 서울 시청 fallback

  const handleLocate = () => {
    refetch()
    if (coords && mapRef.current) {
      mapRef.current.flyTo([coords.lat, coords.lng], 15, { duration: 1 })
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100dvh' }}>

      {/* 지도 */}
      {typeof window !== 'undefined' && (
        <MapContainer
          center={defaultCenter}
          zoom={14}
          zoomControl={false}
          attributionControl={false}
          style={{ width: '100%', height: '100%' }}
          whenReady={() => {
            // coords가 업데이트 되면 flyTo — MapController 통해 처리
          }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            maxZoom={19}
          />
          <MapController mapRef={mapRef} />
        </MapContainer>
      )}

      {/* 검색창 — 상단 오버레이 */}
      <div
        style={{
          position: 'absolute',
          top: 'max(16px, env(safe-area-inset-top))',
          left: 16,
          right: 16,
          zIndex: 1000,
        }}
      >
        <div style={{ boxShadow: 'var(--shadow-sheet)', borderRadius: 'var(--comp-search-radius)' }}>
          <SearchBar
            placeholder="극장 또는 영화 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
        </div>
      </div>

      {/* 줌 + 현위치 버튼 — 우하단 오버레이 */}
      <div
        style={{
          position: 'absolute',
          right: 16,
          bottom: 'max(32px, env(safe-area-inset-bottom))',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <FabRound onClick={() => mapRef.current?.zoomIn()}>
          <IcoPlus />
        </FabRound>
        <FabRound onClick={() => mapRef.current?.zoomOut()}>
          <IcoMinus />
        </FabRound>
        <div style={{ height: 8 }} />
        <FabRound onClick={handleLocate}>
          <IcoLocate />
        </FabRound>
      </div>

    </div>
  )
}
