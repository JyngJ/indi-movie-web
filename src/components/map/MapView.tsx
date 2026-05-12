'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState, useCallback } from 'react'
import type { MutableRefObject, ReactNode } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Map as LeafletMap } from 'leaflet'
import { useUserLocation } from '@/hooks/useUserLocation'
import { SearchBarButton, SearchBar, FabRound } from '@/components/primitives'
import { MapPin, PosterThumb, TheaterSheet, FilterBar } from '@/components/domain'
import { useCatalog } from '@/lib/catalog/client'
import type { CatalogMovie, CatalogTheater } from '@/types/catalog'

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

function makePinIcon(name: string, selected: boolean, zoom: number, totalMovies: number, posterOffsetX = 0) {
  const count = posterCountForZoom(zoom)
  const numRows = count === 6 ? 2 : count > 0 ? 1 : 0
  const posterH = numRows > 0 ? 66 * numRows + 4 * (numRows - 1) + 6 : 0

  const posterHtml = count > 0
    ? `<div style="position:relative;left:${Math.round(posterOffsetX)}px">${renderToStaticMarkup(<PosterGrid count={count} total={totalMovies} />)}</div>`
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
  theaters: CatalogTheater[]
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
  theaters: CatalogTheater[],
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
  theaters: CatalogTheater[],
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
function MapRefSetter({ mapRef }: { mapRef: MutableRefObject<LeafletMap | null> }) {
  mapRef.current = useMap()
  return null
}

function SearchSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 style={{
        margin: '0 0 8px',
        fontSize: 12,
        fontWeight: 700,
        color: 'var(--color-text-caption)',
      }}>
        {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {children}
      </div>
    </section>
  )
}

function SearchResultButton({
  title,
  subtitle,
  disabled = false,
  onClick,
}: {
  title: string
  subtitle?: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        width: '100%',
        minHeight: 56,
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        backgroundColor: 'var(--color-surface-card)',
        padding: '10px 12px',
        textAlign: 'left',
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>{title}</div>
      {subtitle && (
        <div style={{ marginTop: 4, fontSize: 12, color: 'var(--color-text-sub)' }}>{subtitle}</div>
      )}
    </button>
  )
}

/* ── 메인 컴포넌트 ──────────────────────────────────────────────── */
export default function MapView() {
  const { coords, refetch } = useUserLocation()
  const { data: catalog, isError: catalogError, isPlaceholderData } = useCatalog()
  const theaters = catalog?.theaters ?? []
  const movies = catalog?.movies ?? []
  const showtimes = catalog?.showtimes ?? []
  const fallbackMovieId = movies[0]?.id ?? ''
  const mapRef = useRef<LeafletMap | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(14)

  // 검색 오버레이
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  const dummyInputRef = useRef<HTMLInputElement>(null)

  const openSearch = useCallback(() => {
    // iOS Safari: 키보드는 반드시 클릭 핸들러 안에서 동기적으로 focus()가 불려야 열림
    // 1) 클릭 핸들러 동기 컨텍스트 안에서 hidden dummy input 포커스 → iOS가 키보드 세션 시작
    dummyInputRef.current?.focus()
    // 2) 상태 업데이트 → 오버레이 마운트
    setSearchOpen(true)
    // 3) 오버레이 렌더 후 진짜 인풋으로 포커스 이동 (키보드 세션이 이미 열려있으므로 유지됨)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => searchInputRef.current?.focus())
    })
  }, [])

  const closeSearch = useCallback(() => {
    setSearchOpen(false)
    setSearchQuery('')
  }, [])

  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase('ko-KR')
  const matchedTheaters = normalizedSearchQuery
    ? theaters.filter((theater) =>
        [theater.name, theater.address, theater.city].some((value) =>
          value.toLocaleLowerCase('ko-KR').includes(normalizedSearchQuery),
        ),
      ).slice(0, 8)
    : []
  const matchedMovies = normalizedSearchQuery
    ? movies.filter((movie) =>
        [movie.title, movie.originalTitle, movie.director].some((value) =>
          value?.toLocaleLowerCase('ko-KR').includes(normalizedSearchQuery),
        ),
      ).slice(0, 8)
    : []

  // 바텀시트 상태
  const [sheetExpanded, setSheetExpanded] = useState(false)
  const [selectedMovieId, setSelectedMovieId] = useState('')
  const [sheetExiting, setSheetExiting] = useState(false)
  // displayedId: 퇴장 애니메이션 중에도 이전 극장을 유지하기 위한 지연 참조
  const [displayedId, setDisplayedId] = useState<string | null>(null)
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const defaultCenter: [number, number] = [37.5665, 126.978]
  const selectedTheater = theaters.find((t) => t.id === (displayedId ?? selectedId)) ?? null
  const selectedTheaterShowtimes = selectedTheater
    ? showtimes.filter((showtime) => showtime.theaterId === selectedTheater.id)
    : []
  const selectedTheaterMovieIds = new Set(selectedTheaterShowtimes.map((showtime) => showtime.movieId))
  const selectedTheaterMovies = movies.filter((movie) => selectedTheaterMovieIds.has(movie.id))
  const sheetMovies = selectedTheaterMovies.length > 0 ? selectedTheaterMovies : movies

  /* ── 클러스터 & 포스터 오프셋 ── */
  // 초기값: 전체 극장을 개별 클러스터로 (map 준비 전)
  const [clusters, setClusters] = useState<TheaterCluster[]>([])
  const [posterOffsets, setPosterOffsets] = useState<Map<string, number>>(new Map())

  const recompute = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    const c = computeClusters(theaters, map, zoom)
    const o = computePosterOffsets(c, map, zoom)
    setClusters(c)
    setPosterOffsets(o)
  }, [theaters, zoom])

  useEffect(() => {
    setClusters(theaters.map((t) => ({ id: t.id, theaters: [t], lat: t.lat, lng: t.lng })))
  }, [theaters])

  useEffect(() => {
    if (!fallbackMovieId) return
    setSelectedMovieId((current) => current || fallbackMovieId)
  }, [fallbackMovieId])

  useEffect(() => {
    if (!selectedTheater) return
    const firstAvailableMovieId = selectedTheaterShowtimes[0]?.movieId ?? fallbackMovieId
    if (firstAvailableMovieId && !sheetMovies.some((movie) => movie.id === selectedMovieId)) {
      setSelectedMovieId(firstAvailableMovieId)
    }
  }, [fallbackMovieId, selectedMovieId, selectedTheater, selectedTheaterShowtimes, sheetMovies])

  useEffect(() => {
    if (!selectedId) return
    if (!theaters.some((theater) => theater.id === selectedId)) {
      setSelectedId(null)
      setDisplayedId(null)
    }
  }, [selectedId, theaters])

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
      const firstMovieId = showtimes.find((showtime) => showtime.theaterId === theaterId)?.movieId ?? fallbackMovieId
      setSelectedMovieId(firstMovieId)
      setSheetExpanded(false)
      const currentZoom = mapRef.current?.getZoom() ?? 15
      const theater = theaters.find((t) => t.id === theaterId)
      if (theater) {
        mapRef.current?.flyTo(
          [theater.lat, theater.lng],
          Math.max(currentZoom, 15),
          { duration: 0.5 },
        )
      }
    }
  }, [selectedId, closeSheet, fallbackMovieId, showtimes, theaters])

  const selectTheaterFromSearch = useCallback((theater: CatalogTheater) => {
    closeSearch()
    setSelectedId(theater.id)
    setDisplayedId(theater.id)
    setSelectedMovieId(showtimes.find((showtime) => showtime.theaterId === theater.id)?.movieId ?? fallbackMovieId)
    setSheetExpanded(false)
    mapRef.current?.flyTo([theater.lat, theater.lng], Math.max(mapRef.current?.getZoom() ?? 15, 15), { duration: 0.5 })
  }, [closeSearch, fallbackMovieId, showtimes])

  const selectMovieFromSearch = useCallback((movie: CatalogMovie) => {
    const showtime = showtimes.find((item) => item.movieId === movie.id)
    const theater = showtime ? theaters.find((item) => item.id === showtime.theaterId) : undefined
    if (!theater) return
    closeSearch()
    setSelectedId(theater.id)
    setDisplayedId(theater.id)
    setSelectedMovieId(movie.id)
    setSheetExpanded(true)
    mapRef.current?.flyTo([theater.lat, theater.lng], Math.max(mapRef.current?.getZoom() ?? 15, 15), { duration: 0.5 })
  }, [closeSearch, showtimes, theaters])

  // FAB 버튼 bottom: collapsed = COLLAPSED_H(300) + 여유 16 = 316
  // expanded / 시트 없음 = safe area 위 32px
  const fabBottom = selectedTheater && !sheetExpanded ? 316 : 32

  return (
    <div style={{ position: 'relative', width: '100%', height: '100dvh' }}>
      {/* iOS 키보드 트릭용 hidden dummy input — 항상 DOM에 존재 */}
      <input
        ref={dummyInputRef}
        type="text"
        readOnly
        aria-hidden="true"
        tabIndex={-1}
        style={{
          position: 'fixed', top: 0, left: 0,
          width: 1, height: 1, opacity: 0,
          fontSize: 16,  // 16px 미만이면 iOS 자동 줌인
          border: 'none', padding: 0, margin: 0,
          pointerEvents: 'none',
        }}
      />
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
              icon={makePinIcon(theater.name, selectedId === theater.id, zoom, movies.length, offsetX)}
              eventHandlers={{ click: () => handlePinClick(theater.id) }}
            />
          )
        })}
      </MapContainer>

      {/* 검색창 + 필터 칩 */}
      <div style={{
        position: 'absolute',
        top: 'max(0px, env(safe-area-inset-top))',
        left: 0, right: 0,
        zIndex: 1000,
        pointerEvents: 'none',
      }}>
        {/* 검색창 */}
        <div style={{ padding: '16px 16px 0', pointerEvents: 'auto' }}>
          <div style={{ boxShadow: 'var(--shadow-sheet)', borderRadius: 'var(--comp-search-radius)' }}>
            <SearchBarButton
              placeholder="극장 또는 영화 검색"
              onClick={openSearch}
            />
          </div>
        </div>
        {/* 필터 칩 */}
        <div style={{ marginTop: 8, pointerEvents: 'auto' }}>
          <FilterBar />
        </div>
      </div>

      {/* 검색 오버레이 — same page, iOS 키보드 대응 */}
      {searchOpen && (
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'var(--color-surface-bg)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 2000,
        }}>
          {/* 검색바 헤더 */}
          <div style={{
            paddingTop: 'max(12px, env(safe-area-inset-top))',
            paddingLeft: 16,
            paddingRight: 16,
            paddingBottom: 12,
            borderBottom: '1px solid var(--color-border)',
            flexShrink: 0,
          }}>
            <SearchBar
              ref={searchInputRef}
              value={searchQuery}
              placeholder="극장 또는 영화 검색"
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery('')}
              onBack={closeSearch}
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
            {searchQuery === '' ? (
              <p style={{ textAlign: 'center', marginTop: 60, fontSize: 14, color: 'var(--color-text-caption)' }}>
                극장명, 영화 제목, 감독 이름으로 검색하세요
              </p>
            ) : matchedTheaters.length === 0 && matchedMovies.length === 0 ? (
              <p style={{ textAlign: 'center', marginTop: 60, fontSize: 14, color: 'var(--color-text-caption)' }}>
                &ldquo;{searchQuery}&rdquo;에 맞는 결과가 없습니다.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                {matchedTheaters.length > 0 && (
                  <SearchSection title="극장">
                    {matchedTheaters.map((theater) => (
                      <SearchResultButton
                        key={theater.id}
                        title={theater.name}
                        subtitle={theater.address}
                        onClick={() => selectTheaterFromSearch(theater)}
                      />
                    ))}
                  </SearchSection>
                )}
                {matchedMovies.length > 0 && (
                  <SearchSection title="영화">
                    {matchedMovies.map((movie) => {
                      const count = showtimes.filter((showtime) => showtime.movieId === movie.id).length
                      return (
                        <SearchResultButton
                          key={movie.id}
                          title={movie.title}
                          subtitle={[movie.director, count > 0 ? `${count}회 상영` : '상영 정보 없음'].filter(Boolean).join(' · ')}
                          disabled={count === 0}
                          onClick={() => selectMovieFromSearch(movie)}
                        />
                      )
                    })}
                  </SearchSection>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {(catalogError || isPlaceholderData) && (
        <div style={{
          position: 'absolute',
          left: 16,
          bottom: selectedTheater ? fabBottom + 160 : 24,
          zIndex: 1000,
          maxWidth: 260,
          borderRadius: 8,
          padding: '8px 10px',
          backgroundColor: 'rgba(26, 23, 20, 0.78)',
          color: '#fff',
          fontSize: 12,
          lineHeight: 1.4,
          pointerEvents: 'none',
        }}>
          {catalogError ? '실제 DB 연결 실패: 임시 데이터 표시 중' : '실제 DB 불러오는 중'}
        </div>
      )}

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
          movies={sheetMovies}
          showtimes={selectedTheaterShowtimes}
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
