'use client'

import 'leaflet/dist/leaflet.css'
import { useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Map as LeafletMap } from 'leaflet'
import { useUserLocation } from '@/hooks/useUserLocation'
import { SearchBar, FabRound } from '@/components/primitives'
import { MapPin, PosterThumb } from '@/components/domain'
import { MOCK_THEATERS } from '@/mocks/theaters'
import { MOCK_MOVIES } from '@/mocks/movies'

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

/* ── 줌별 포스터 수 ─────────────────────────────────────────────── */
// zoom 16+  → 6장 (3×2)
// zoom 15   → 3장
// zoom 14   → 1장 + 오버플로우
// zoom ≤ 13 → 표시 없음
function posterCountForZoom(zoom: number): number {
  if (zoom >= 16) return 6
  if (zoom >= 15) return 3
  if (zoom >= 14) return 1
  return 0
}

/* ── 포스터 그리드 ──────────────────────────────────────────────── */
function PosterGrid({ count, total }: { count: number; total: number }) {
  const overflow = total > count ? total - count : 0
  const perRow = count === 6 ? 3 : count

  return (
    <div style={{ position: 'relative', marginTop: 6 }}>
      <div style={{
        position: 'absolute', top: -8, left: 0,
        fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 3,
        backgroundColor: 'rgba(255,180,0,0.9)', color: '#1A1714',
        letterSpacing: '0.3px', whiteSpace: 'nowrap', zIndex: 1,
      }}>MOCK</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {Array.from({ length: count === 6 ? 2 : 1 }).map((_, row) => (
          <div key={row} style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: perRow }).map((_, col) => {
              const idx = row * perRow + col
              return (
                <PosterThumb
                  key={idx}
                  width={44}
                  height={66}
                  size="sm"
                  overflow={idx === count - 1 && overflow > 0 ? overflow : undefined}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── DivIcon 생성 ───────────────────────────────────────────────── */
// 핀 구조: 라벨(20px) + gap(4px) + dot(22px)
// iconAnchor y = 20 + 4 + 11 = 35 → dot 중심, 항상 고정
const LABEL_H = 20
const GAP = 4
const DOT = 22
const ANCHOR_Y = LABEL_H + GAP + DOT / 2

const TOTAL_MOVIES = MOCK_MOVIES.length

function makePinIcon(name: string, selected: boolean, zoom: number) {
  const count = posterCountForZoom(zoom)
  const numRows = count === 6 ? 2 : count > 0 ? 1 : 0
  const posterH = numRows > 0 ? 66 * numRows + 4 * (numRows - 1) + 6 : 0

  const html = `
    <div style="width:140px;display:flex;flex-direction:column;align-items:center;overflow:visible;">
      ${renderToStaticMarkup(<MapPin kind="indie" selected={selected} label={name} />)}
      ${count > 0 ? renderToStaticMarkup(<PosterGrid count={count} total={TOTAL_MOVIES} />) : ''}
    </div>
  `

  return L.divIcon({
    html,
    className: '',
    iconSize: [140, LABEL_H + GAP + DOT + posterH],
    iconAnchor: [70, ANCHOR_Y],   // dot 중심 — zoom/포스터 수 무관 고정
  })
}

/* ── 줌 트래커 ─────────────────────────────────────────────────── */
function ZoomTracker({ onZoom }: { onZoom: (z: number) => void }) {
  useMapEvents({ zoomend: (e) => onZoom(e.target.getZoom()) })
  return null
}

/* ── mapRef 주입 ────────────────────────────────────────────────── */
function MapRefSetter({ mapRef }: { mapRef: React.MutableRefObject<LeafletMap | null> }) {
  mapRef.current = useMap()
  return null
}

/* ── 메인 컴포넌트 ──────────────────────────────────────────────── */
export default function MapView() {
  const { coords, refetch } = useUserLocation()
  const mapRef = useRef<LeafletMap | null>(null)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(14)

  const defaultCenter: [number, number] = coords
    ? [coords.lat, coords.lng]
    : [37.5665, 126.978]

  const handleLocate = () => {
    refetch()
    if (coords && mapRef.current) {
      mapRef.current.flyTo([coords.lat, coords.lng], 15, { duration: 1 })
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100dvh' }}>
      <MapContainer
        center={defaultCenter}
        zoom={14}
        zoomControl={false}
        attributionControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          maxZoom={19}
        />
        <MapRefSetter mapRef={mapRef} />
        <ZoomTracker onZoom={setZoom} />

        {MOCK_THEATERS.map((theater) => (
          <Marker
            key={theater.id}
            position={[theater.lat, theater.lng]}
            icon={makePinIcon(theater.name, selectedId === theater.id, zoom)}
            eventHandlers={{
              click: () => {
                if (selectedId === theater.id) {
                  setSelectedId(null)
                } else {
                  setSelectedId(theater.id)
                  mapRef.current?.flyTo(
                    [theater.lat, theater.lng],
                    mapRef.current.getZoom(),
                    { duration: 0.4 }
                  )
                }
              },
            }}
          />
        ))}
      </MapContainer>

      {/* 검색창 */}
      <div style={{
        position: 'absolute',
        top: 'max(16px, env(safe-area-inset-top))',
        left: 16, right: 16, zIndex: 1000,
      }}>
        <div style={{ boxShadow: 'var(--shadow-sheet)', borderRadius: 'var(--comp-search-radius)' }}>
          <SearchBar
            placeholder="극장 또는 영화 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
        </div>
      </div>

      {/* 줌 + 현위치 */}
      <div style={{
        position: 'absolute',
        right: 16,
        bottom: 'max(32px, env(safe-area-inset-bottom))',
        zIndex: 1000,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <FabRound onClick={() => mapRef.current?.zoomIn()}><IcoPlus /></FabRound>
        <FabRound onClick={() => mapRef.current?.zoomOut()}><IcoMinus /></FabRound>
        <div style={{ height: 8 }} />
        <FabRound onClick={handleLocate}><IcoLocate /></FabRound>
      </div>
    </div>
  )
}
