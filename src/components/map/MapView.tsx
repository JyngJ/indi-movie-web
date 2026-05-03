'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Map as LeafletMap } from 'leaflet'
import { useUserLocation } from '@/hooks/useUserLocation'
import { useRouter } from 'next/navigation'
import { SearchBarButton, FabRound } from '@/components/primitives'
import { MapPin, PosterThumb, TheaterSheet } from '@/components/domain'
import { MOCK_THEATERS, type MockTheater } from '@/mocks/theaters'
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
      {/* 흰 카드 배경 */}
      <div style={{
        backgroundColor: 'rgba(255,255,255,0.92)',
        borderRadius: 8,
        padding: '8px 8px 8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
        display: 'inline-block',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', top: -7, left: 4,
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

function makePinIcon(name: string, selected: boolean, zoom: number, posterOffsetX = 0) {
  const count = posterCountForZoom(zoom)
  const numRows = count === 6 ? 2 : count > 0 ? 1 : 0
  const posterH = numRows > 0 ? 66 * numRows + 4 * (numRows - 1) + 6 : 0

  const posterHtml = count > 0
    ? `<div style="position:relative;left:${Math.round(posterOffsetX)}px">${renderToStaticMarkup(<PosterGrid count={count} total={TOTAL_MOVIES} />)}</div>`
    : ''

  const html = `
    <div style="width:140px;display:flex;flex-direction:column;align-items:center;overflow:visible;">
      ${renderToStaticMarkup(<MapPin kind="indie" selected={selected} label={name} />)}
      ${posterHtml}
    </div>
  `

  return L.divIcon({
    html,
    className: '',
    iconSize: [140, LABEL_H + GAP + DOT + posterH],
    iconAnchor: [70, ANCHOR_Y],   // dot 중심 — zoom/포스터 수 무관 고정
  })
}

/* ── 클러스터 타입 ─────────────────────────────────────────────── */
interface TheaterCluster {
  id: string
  theaters: MockTheater[]
  lat: number
  lng: number
}

/* ── 줌 레벨에서 클러스터링 반경(px) ── */
function clusterRadiusForZoom(zoom: number): number {
  if (zoom >= 16) return 30
  if (zoom >= 15) return 45
  if (zoom >= 14) return 60
  return 80
}

/* ── 픽셀 거리 기반 클러스터 계산 ─────────────────────────────── */
function computeClusters(
  theaters: MockTheater[],
  map: LeafletMap,
  zoom: number,
): TheaterCluster[] {
  const radiusPx = clusterRadiusForZoom(zoom)
  const pts = theaters.map((t) => ({
    t,
    px: map.latLngToContainerPoint([t.lat, t.lng] as [number, number]),
  }))
  const used = new Set<string>()
  const clusters: TheaterCluster[] = []

  for (const a of pts) {
    if (used.has(a.t.id)) continue
    const group = [a]
    used.add(a.t.id)
    for (const b of pts) {
      if (used.has(b.t.id)) continue
      if (a.px.distanceTo(b.px) < radiusPx) {
        group.push(b)
        used.add(b.t.id)
      }
    }
    const lat = group.reduce((s, g) => s + g.t.lat, 0) / group.length
    const lng = group.reduce((s, g) => s + g.t.lng, 0) / group.length
    clusters.push({ id: a.t.id, theaters: group.map((g) => g.t), lat, lng })
  }

  return clusters
}

/* ── 포스터 겹침 방지 오프셋 계산 ─────────────────────────────── */
// 단일 마커끼리 포스터(140px)가 겹치면 양쪽을 수평으로 밀어냄
function computePosterOffsets(
  clusters: TheaterCluster[],
  map: LeafletMap,
  zoom: number,
): Map<string, number> {
  const offsets = new Map<string, number>()
  if (posterCountForZoom(zoom) === 0) return offsets

  const POSTER_W = 140
  const singles = clusters
    .filter((c) => c.theaters.length === 1)
    .map((c) => ({
      id: c.id,
      px: map.latLngToContainerPoint([c.lat, c.lng] as [number, number]),
    }))

  for (let i = 0; i < singles.length; i++) {
    for (let j = i + 1; j < singles.length; j++) {
      const a = singles[i]
      const b = singles[j]
      const dx = b.px.x - a.px.x
      const dy = Math.abs(b.px.y - a.px.y)
      if (dy > 120) continue
      const overlap = POSTER_W - Math.abs(dx)
      if (overlap <= 0) continue
      const shift = overlap / 2 + 8
      offsets.set(a.id, (offsets.get(a.id) ?? 0) + (dx >= 0 ? -shift : shift))
      offsets.set(b.id, (offsets.get(b.id) ?? 0) + (dx >= 0 ? shift : -shift))
    }
  }

  return offsets
}

/* ── 클러스터 아이콘 ────────────────────────────────────────────── */
function makeClusterIcon(count: number) {
  const SIZE = 40
  const html = `<div style="
    width:${SIZE}px;height:${SIZE}px;border-radius:50%;
    background:#2C3E50;
    display:flex;align-items:center;justify-content:center;
    color:#fff;font-weight:700;font-size:16px;line-height:1;
    box-shadow:0 2px 10px rgba(0,0,0,0.35);
    border:2.5px solid rgba(255,255,255,0.85);
  ">${count}</div>`
  return L.divIcon({ html, className: '', iconSize: [SIZE, SIZE], iconAnchor: [SIZE / 2, SIZE / 2] })
}

/* ── 클러스터가 분리되는 최소 줌 계산 ── */
function findSplitZoom(
  theaters: MockTheater[],
  map: LeafletMap,
  currentZoom: number,
): number {
  for (let z = currentZoom + 1; z <= 19; z++) {
    const radius = clusterRadiusForZoom(z)
    // 이 줌에서 픽셀 거리 계산 (latLngToContainerPoint는 현재 줌 기준이므로 비율로 환산)
    const zoomScale = Math.pow(2, z - currentZoom)
    const pts = theaters.map((t) => {
      const base = map.latLngToContainerPoint([t.lat, t.lng] as [number, number])
      return { id: t.id, x: base.x * zoomScale, y: base.y * zoomScale }
    })
    // 이 줌에서 모든 쌍이 radius 밖으로 벗어나는지 확인
    let allSeparated = true
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x
        const dy = pts[i].y - pts[j].y
        if (Math.sqrt(dx * dx + dy * dy) < radius) {
          allSeparated = false
          break
        }
      }
      if (!allSeparated) break
    }
    if (allSeparated) return z
  }
  return Math.min(currentZoom + 4, 19)
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
  const router = useRouter()
  const { coords, refetch } = useUserLocation()
  const mapRef = useRef<LeafletMap | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(14)

  // 바텀시트 상태
  const [sheetExpanded, setSheetExpanded] = useState(false)
  const [selectedMovieId, setSelectedMovieId] = useState(MOCK_MOVIES[0].id)
  const [sheetExiting, setSheetExiting] = useState(false)
  // displayedId: 퇴장 애니메이션 중에도 이전 극장을 유지하기 위한 지연 참조
  const [displayedId, setDisplayedId] = useState<string | null>(null)
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const defaultCenter: [number, number] = [37.5665, 126.978]
  const selectedTheater = MOCK_THEATERS.find((t) => t.id === (displayedId ?? selectedId)) ?? null

  /* ── 클러스터 & 포스터 오프셋 ── */
  // 초기값: 전체 극장을 개별 클러스터로 (map 준비 전)
  const [clusters, setClusters] = useState<TheaterCluster[]>(() =>
    MOCK_THEATERS.map((t) => ({ id: t.id, theaters: [t], lat: t.lat, lng: t.lng }))
  )
  const [posterOffsets, setPosterOffsets] = useState<Map<string, number>>(new Map())

  const recompute = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    const c = computeClusters(MOCK_THEATERS, map, zoom)
    const o = computePosterOffsets(c, map, zoom)
    setClusters(c)
    setPosterOffsets(o)
  }, [zoom])

  // zoom 변경 시 재계산 (줌 애니메이션 끝난 뒤)
  useEffect(() => {
    const id = setTimeout(recompute, 80)
    return () => clearTimeout(id)
  }, [recompute])

  // 위치 첫 수신 시 지도 이동 — 이후엔 무시
  const initialMoved = useRef(false)
  useEffect(() => {
    if (coords && !initialMoved.current && mapRef.current) {
      initialMoved.current = true
      mapRef.current.flyTo([coords.lat, coords.lng], 14, { duration: 1 })
    }
  }, [coords])

  const handleLocate = useCallback(() => {
    refetch()
    if (coords && mapRef.current) {
      mapRef.current.flyTo([coords.lat, coords.lng], 15, { duration: 1 })
    }
  }, [coords, refetch])

  // 퇴장 애니메이션 후 완전히 언마운트
  const closeSheet = useCallback(() => {
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current)
    setSheetExiting(true)
    exitTimerRef.current = setTimeout(() => {
      setSelectedId(null)
      setDisplayedId(null)
      setSheetExpanded(false)
      setSheetExiting(false)
    }, 400)
  }, [])

  // 극장 선택 시 → 첫 번째 영화 선택 + 시트 collapsed로 열기
  const handlePinClick = useCallback((theaterId: string) => {
    if (selectedId === theaterId) {
      closeSheet()
    } else {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current)
      setSheetExiting(false)
      setSelectedId(theaterId)
      setDisplayedId(theaterId)
      setSelectedMovieId(MOCK_MOVIES[0].id)
      setSheetExpanded(false)
      const currentZoom = mapRef.current?.getZoom() ?? 15
      const theater = MOCK_THEATERS.find((t) => t.id === theaterId)
      if (theater) {
        mapRef.current?.flyTo(
          [theater.lat, theater.lng],
          Math.max(currentZoom, 15),
          { duration: 0.5 },
        )
      }
    }
  }, [selectedId, closeSheet])

  // FAB 버튼 bottom: collapsed = COLLAPSED_H(300) + 여유 16 = 316
  // expanded / 시트 없음 = safe area 위 32px
  const fabBottom = selectedTheater && !sheetExpanded ? 316 : 32

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

        {clusters.map((cluster) => {
          // 클러스터 마커 (2개 이상) — 클릭 시 줌인
          if (cluster.theaters.length > 1) {
            return (
              <Marker
                key={`cluster-${cluster.id}`}
                position={[cluster.lat, cluster.lng]}
                icon={makeClusterIcon(cluster.theaters.length)}
                eventHandlers={{
                  click: () => {
                    const map = mapRef.current
                    if (!map) return
                    const currentZoom = map.getZoom()
                    const splitZoom = findSplitZoom(cluster.theaters, map, currentZoom)
                    const bounds = L.latLngBounds(
                      cluster.theaters.map((t) => [t.lat, t.lng] as [number, number])
                    )
                    // fitBounds로 전체가 뷰포트 안에 들어오는 줌/센터 계산
                    // maxZoom을 splitZoom으로 제한 → 분리 가능하면 분리, 아니면 화면 내 최대로
                    map.flyToBounds(bounds, {
                      padding: [80, 80],
                      maxZoom: splitZoom,
                      duration: 0.6,
                    })
                  },
                }}
              />
            )
          }
          // 단일 마커 — 포스터 오프셋 적용
          const theater = cluster.theaters[0]
          const offsetX = posterOffsets.get(theater.id) ?? 0
          return (
            <Marker
              key={theater.id}
              position={[theater.lat, theater.lng]}
              icon={makePinIcon(theater.name, selectedId === theater.id, zoom, offsetX)}
              eventHandlers={{ click: () => handlePinClick(theater.id) }}
            />
          )
        })}
      </MapContainer>

      {/* 검색창 버튼 — 클릭 시 /search 로 이동 */}
      <div style={{
        position: 'absolute',
        top: 'max(16px, env(safe-area-inset-top))',
        left: 16, right: 16, zIndex: 1000,
      }}>
        <div style={{ boxShadow: 'var(--shadow-sheet)', borderRadius: 'var(--comp-search-radius)' }}>
          <SearchBarButton
            placeholder="극장 또는 영화 검색"
            onClick={() => router.push('/search')}
          />
        </div>
      </div>

      {/* 줌 + 현위치 */}
      <div style={{
        position: 'absolute',
        right: 16,
        bottom: fabBottom,
        zIndex: 1000,
        display: 'flex', flexDirection: 'column', gap: 8,
        transition: 'bottom 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
      }}>
        <FabRound onClick={() => mapRef.current?.zoomIn()}><IcoPlus /></FabRound>
        <FabRound onClick={() => mapRef.current?.zoomOut()}><IcoMinus /></FabRound>
        <div style={{ height: 8 }} />
        <FabRound onClick={handleLocate}><IcoLocate /></FabRound>
      </div>

      {/* 드래그 바텀시트 — TheaterSheet가 자체적으로 Leaflet 이벤트 차단 */}
      {selectedTheater && (
        <TheaterSheet
          theater={selectedTheater}
          expanded={sheetExpanded}
          exiting={sheetExiting}
          selectedMovieId={selectedMovieId}
          onMovieSelect={setSelectedMovieId}
          onExpand={() => setSheetExpanded(true)}
          onCollapse={() => setSheetExpanded(false)}
          onClose={closeSheet}
          favorited={false}
          onFavorite={() => { /* Phase 4 */ }}
        />
      )}
    </div>
  )
}
