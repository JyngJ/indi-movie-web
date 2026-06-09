'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState, useCallback, useMemo, type CSSProperties } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { GeoJSON, MapContainer, TileLayer, Marker } from 'react-leaflet'
import L from 'leaflet'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Map as LeafletMap, Point as LeafletPoint } from 'leaflet'
import { useLocationPermission } from '@/hooks/useLocationPermission'
import { useIsDark } from '@/hooks/useIsDark'
import { useIsDesktopLayout } from '@/hooks/useIsDesktopLayout'
import { SearchBarButton, SearchBar, FabRound, Toast } from '@/components/primitives'
import { GLOBAL_NAV_DESKTOP_WIDTH, GLOBAL_NAV_MOBILE_HEIGHT } from '@/components/navigation/GlobalNav'
import { MapPin, TheaterSheet, MovieSheet, CurationSheet, CurationSections, FilterBar, LocationPermissionModal, CURATION_PEEK_HEIGHT } from '@/components/domain'
import type { CurationSnap } from '@/components/domain'
import { DesktopDetailPanel } from '@/components/domain/DesktopDetailPanel'
import type { DesktopPanelState } from '@/components/domain/DesktopDetailPanel'
import type { FilterState } from '@/components/domain'
import { useActiveMovieIds, useMapShowtimes, useMovies, useStations, useTheaters } from '@/lib/supabase/queries'
import type { Movie, Station, Theater } from '@/types/api'
import { SEOUL_GU, SEOUL_DONG } from '@/data/seoul-areas'
import { normalizeGenre } from '@/lib/genres'
import { getRegionFromCity, getRegionFromCoords, REGION_BOUNDS } from '@/lib/regions'
import { useThemeStore } from '@/store/themeStore'
import { useUIStore } from '@/store/uiStore'
import { REPORT_CATEGORIES } from '@/lib/reports/types'
import {
  SUBWAY_LINES, SUBWAY_LINE_MIN_ZOOM, STATION_PIN_MIN_ZOOM,
  subwayLineStyle, subwayLineColor, makeStationIcon,
} from '@/lib/map/subwayUtils'
import { finiteNumber, formatDateParam, startOfLocalDay, addDays, endOfMonth, loadRecentSearches, addToRecent, removeFromRecent } from '@/lib/map/searchUtils'
import { stationSearchScore, movieSearchScore, directorSearchScore, theaterSearchScore, areaSearchScore } from '@/lib/map/searchScoring'
import { posterCountForZoom, posterSizeForZoom, posterSlotsForZoom } from '@/lib/map/posterLogic'
import { calculateAndFormatDistance } from '@/lib/map/distanceUtils'
import type { TheaterPosterMovie } from '@/lib/map/posterLogic'
import { classifySessionIntent, trackEvent } from '@/lib/analytics/client'
import { recordRecentlyViewed } from '@/lib/curation/recentlyViewed'
import { cookieStorageAdapter } from '@/lib/adapters/cookieStorage'
import { useCurationData } from '@/hooks/useCurationData'
import { springFlyTo, springFlyToBounds, springActive, setSpringSettledCallback } from '@/lib/mapSpring'
import { PosterGrid } from './PosterGrid'
import { ViewportTracker, ZoomSlider, OffScreenTracker, MapRefSetter, MapInteractionTracker, IcoPlus, IcoMinus, IcoLocate, IcoSun, IcoMoon } from './MapControls'
import { SettingsPanel } from './SettingsPanel'

const SEARCH_CROSS_RESULT_LIMIT = 5
const STATION_BOUNDS_PADDING = 0.25
const SUBWAY_LAYER_ENTER_DELAY_MS = 120
const MAP_MIN_ZOOM = 7
const MAP_MAX_ZOOM = 19
const KOREA_MAP_BOUNDS: L.LatLngBoundsExpression = [
  [32.8, 124.2],
  [39.8, 132.2],
]

/** 데스크톱 좌측 상시 도크 폭 — 검색 패널과 같은 폭(440 * 0.8) */
const DESKTOP_DOCK_WIDTH = 352

function dateRangeForFilter(filter: FilterState) {
  const today = startOfLocalDay(new Date())
  switch (filter.dateId) {
    case 'today':
      return { start: today, end: today }
    case 'tomorrow': {
      const tomorrow = addDays(today, 1)
      return { start: tomorrow, end: tomorrow }
    }
    case 'this-weekend': {
      const dow = today.getDay()
      const daysToSat = dow === 0 ? 6 : 6 - dow
      const saturday = addDays(today, daysToSat)
      return { start: saturday, end: addDays(saturday, 1) }
    }
    case 'next-weekend': {
      const dow = today.getDay()
      const daysToSat = dow === 0 ? 6 : 6 - dow
      const saturday = addDays(today, daysToSat + 7)
      return { start: saturday, end: addDays(saturday, 1) }
    }
    case 'this-month':
      return { start: today, end: endOfMonth(today) }
    case 'custom':
      return {
        start: filter.customStart ? startOfLocalDay(filter.customStart) : today,
        end: filter.customEnd ? startOfLocalDay(filter.customEnd) : filter.customStart ? startOfLocalDay(filter.customStart) : addDays(today, 7),
      }
    case null:
      return { start: today, end: addDays(today, 30) }
    case 'this-week':
    default:
      return { start: today, end: addDays(today, 6) }
  }
}


/* ── DivIcon 생성 ───────────────────────────────────────────────── */
// 핀 구조: 라벨(20px) + gap(4px) + dot(22px)
// iconAnchor y = 20 + 4 + 11 = 35 → dot 중심, 항상 고정
const LABEL_H = 20
const GAP = 4
const DOT = 22
const ANCHOR_Y = LABEL_H + GAP + DOT / 2

type LabelOffset = { x: number; y: number }

function isMapProjectionReady(map: LeafletMap) {
  const internalMap = map as LeafletMap & { _loaded?: boolean; _mapPane?: HTMLElement }
  const container = map.getContainer()
  const size = map.getSize()
  return !!internalMap._loaded && !!internalMap._mapPane && container.isConnected && size.x > 0 && size.y > 0
}

// 동일 입력에 대해 renderToStaticMarkup 중복 호출 방지
const _pinIconCache = new Map<string, L.DivIcon>()

function makePinIcon(
  name: string,
  selected: boolean,
  zoom: number,
  posterMovies: TheaterPosterMovie[],
  filtersActive = false,
  posterOffsetX = 0,
  labelOffset: LabelOffset = { x: 0, y: 0 },
  isDark = false,
  dimmed = false,
  isDesktop = false,
) {
  // 캐시 키: 모든 입력을 직렬화 — 같은 조합이면 renderToStaticMarkup 재사용
  const moviesKey = posterMovies.map(m => `${m.id}:${m.matchesFilter ? 1 : 0}:${m.showtimesToday?.map(s => s.time + (s.soldout ? 'x' : '') + (s.past ? 'p' : '')).join('|') ?? ''}`).join(',')
  const loKey = `${Math.round(labelOffset?.x ?? 0)},${Math.round(labelOffset?.y ?? 0)}`
  const cacheKey = `${name}|${selected ? 1 : 0}|${zoom}|${moviesKey}|${filtersActive ? 1 : 0}|${Math.round(finiteNumber(posterOffsetX) * 2) / 2}|${loKey}|${isDark ? 1 : 0}|${dimmed ? 1 : 0}|${isDesktop ? 1 : 0}`
  const cached = _pinIconCache.get(cacheKey)
  if (cached) return cached

  // 선택된 극장은 충돌 감지 무시 — 항상 중앙
  const safePosterOffsetX = selected ? 0 : finiteNumber(posterOffsetX)
  const forceMinOne = filtersActive && posterMovies.some(m => m.matchesFilter)
  const slots = posterSlotsForZoom(posterMovies, zoom, filtersActive, forceMinOne)
  const matchCount = filtersActive ? posterMovies.filter(m => m.matchesFilter).length : undefined
  const numRows = slots.length > 3 ? 2 : slots.length > 0 ? 1 : 0
  const usePosterLeft = slots.length > 0 && safePosterOffsetX < -80
  const { w: pW, h: pH } = posterSizeForZoom(zoom, isDesktop)
  const posterH = usePosterLeft || numRows === 0 ? 0 : pH * numRows + 4 * (numRows - 1) + 6

  // 포스터 없는 줌 구간 (11-13)에서 "N편 상영중" 태그 표시
  const showCountTag = slots.length === 0 && !forceMinOne && posterMovies.length > 0
  const COUNT_TAG_H = showCountTag ? 30 : 0

  let posterHtml = ''
  if (slots.length > 0) {
    const posterMarkup = renderToStaticMarkup(
      <PosterGrid
        slots={slots}
        tailDir={usePosterLeft ? 'right' : 'up'}
        tailOffset={usePosterLeft ? 0 : safePosterOffsetX}
        matchCount={matchCount}
        filtersActive={filtersActive}
        selected={selected}
        posterW={pW}
        posterH={pH}
        allMovies={posterMovies}
      />
    )
    if (usePosterLeft) {
      // 핀 도트 바로 아래부터 시작 — 라벨/도트를 가리지 않도록
      posterHtml =
        `<div style="position:absolute;` +
        `right:calc(50% + ${DOT / 2 + 4}px);` +
        `top:${LABEL_H + GAP + DOT}px;">` +
        posterMarkup +
        `</div>`
    } else {
      const scaleStyle = selected
        ? 'transform-origin:center top;transform:scale(1.1);'
        : ''
      posterHtml = `<div style="position:relative;left:${Math.round(safePosterOffsetX)}px;${scaleStyle}">` +
        posterMarkup +
        `</div>`
    }
  }

  const countTagHtml = showCountTag ? (() => {
    const cnt = posterMovies.length
    const TAG_TOP = LABEL_H + GAP + DOT + 9
    return `<div style="position:absolute;top:${TAG_TOP}px;left:50%;transform:translateX(-50%);z-index:1;pointer-events:none;">` +
      `<div style="position:absolute;top:-5px;left:50%;transform:translateX(-50%) rotate(45deg);` +
      `width:10px;height:10px;background:var(--color-surface-card);` +
      `border-top:1.5px solid var(--color-border);border-left:1.5px solid var(--color-border);` +
      `border-top-left-radius:2px;z-index:0;"></div>` +
      `<div style="position:relative;background:var(--color-surface-card);` +
      `border:1.5px solid var(--color-border);border-radius:10px;` +
      `padding:3px 8px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.13);z-index:1;">` +
      `<span style="font-size:11px;font-weight:700;color:var(--color-primary-base);">${cnt}편</span>` +
      `</div></div>`
  })() : ''

  const pinHtml = renderToStaticMarkup(<MapPin kind="indie" selected={selected} label={name} labelOffset={labelOffset} dimmed={dimmed} isDark={isDark} />)
  const html = `
    <div style="width:140px;display:flex;flex-direction:column;align-items:center;overflow:visible;position:relative;">
      <div style="position:relative;z-index:3;align-self:center;">${pinHtml}</div>
      ${posterHtml}
      ${countTagHtml}
    </div>
  `

  const icon = L.divIcon({
    html,
    className: '',
    iconSize: [140, LABEL_H + GAP + DOT + posterH + COUNT_TAG_H],
    iconAnchor: [70, ANCHOR_Y],
  })
  _pinIconCache.set(cacheKey, icon)
  return icon
}

/* ── 클러스터 타입 ─────────────────────────────────────────────── */
interface TheaterCluster {
  id: string
  theaters: Theater[]
  lat: number
  lng: number
  isCoLocation?: boolean  // 동일 건물 — 클릭 시 CO_LOCATE_SPLIT_ZOOM으로 이동
  regionLabel?: string    // 줌 7-8: 지역명 표시
  cityLabel?: string      // 줌 9: 도시명 표시
  clusterCount?: number   // 줌 9: 극장 수 표시
}

type LabelDir = 'top' | 'right' | 'bottom' | 'left'

// 3개 이하 클러스터 이름카드 방향 계산. 먼저 배치된 카드와 겹치지 않는 방향을 고른다.
function computeLabelDirections(
  clusters: TheaterCluster[],
  map: LeafletMap,
): Map<string, LabelDir> {
  const CARD_W = 130
  const CARD_GAP = 6
  const DOT_R = 14
  type Rect = [number, number, number, number]
  const hit = (a: Rect, b: Rect, margin = 4): boolean =>
    a[0] < b[2] + margin && a[2] > b[0] - margin && a[1] < b[3] + margin && a[3] > b[1] - margin
  const result = new Map<string, LabelDir>()
  const placed: Rect[] = []

  for (const c of clusters) {
    if (c.theaters.length <= 1 || c.theaters.length > 3) continue
    const { x: cx, y: cy } = map.latLngToContainerPoint([c.lat, c.lng])
    const cardH = 18 * c.theaters.length + 12
    const cands: Record<LabelDir, Rect> = {
      top: [cx - CARD_W / 2, cy - DOT_R - CARD_GAP - cardH, cx + CARD_W / 2, cy - DOT_R - CARD_GAP],
      bottom: [cx - CARD_W / 2, cy + DOT_R + CARD_GAP, cx + CARD_W / 2, cy + DOT_R + CARD_GAP + cardH],
      right: [cx + DOT_R + CARD_GAP, cy - cardH / 2, cx + DOT_R + CARD_GAP + CARD_W, cy + cardH / 2],
      left: [cx - DOT_R - CARD_GAP - CARD_W, cy - cardH / 2, cx - DOT_R - CARD_GAP, cy + cardH / 2],
    }

    let best: LabelDir = 'top'
    for (const dir of ['top', 'right', 'left'] as LabelDir[]) {
      if (!placed.some(rect => hit(cands[dir], rect))) {
        best = dir
        break
      }
    }
    result.set(c.id, best)
    placed.push(cands[best])
  }
  return result
}

function estimateLabelWidth(label: string) {
  return Math.min(200, Math.max(46, label.length * 13 + 14))
}

function computeNameLabelOffsets(
  clusters: TheaterCluster[],
  map: LeafletMap,
  labelDirections: Map<string, LabelDir>,
): Map<string, LabelOffset> {
  type Rect = [number, number, number, number]
  type LabelItem = { id: string; priority: number; rect: Rect }
  // 조금 겹쳐도 허용 — 12px 이상 겹칠 때만 이동 시도
  const margin = -12
  const hit = (a: Rect, b: Rect): boolean =>
    a[0] < b[2] + margin && a[2] > b[0] - margin && a[1] < b[3] + margin && a[3] > b[1] - margin
  const move = (r: Rect, o: LabelOffset): Rect => [r[0] + o.x, r[1] + o.y, r[2] + o.x, r[3] + o.y]
  const items: LabelItem[] = []

  for (const c of clusters) {
    const { x: cx, y: cy } = map.latLngToContainerPoint([c.lat, c.lng] as [number, number])
    if (c.theaters.length === 1) {
      const labelW = estimateLabelWidth(c.theaters[0].name)
      items.push({
        id: c.id,
        priority: 1,
        rect: [cx - labelW / 2, cy - ANCHOR_Y, cx + labelW / 2, cy - ANCHOR_Y + LABEL_H],
      })
      continue
    }

    if (c.theaters.length <= 3) {
      const dotR = 14
      const cardGap = 8
      const cardW = Math.min(180, Math.max(...c.theaters.map(t => estimateLabelWidth(t.name))))
      const cardH = 18 * c.theaters.length + 12
      const dir = labelDirections.get(c.id) ?? 'top'
      const rects: Record<LabelDir, Rect> = {
        top: [cx - cardW / 2, cy - dotR - cardGap - cardH, cx + cardW / 2, cy - dotR - cardGap],
        bottom: [cx - cardW / 2, cy + dotR + cardGap, cx + cardW / 2, cy + dotR + cardGap + cardH],
        right: [cx + dotR + cardGap, cy - cardH / 2, cx + dotR + cardGap + cardW, cy + cardH / 2],
        left: [cx - dotR - cardGap - cardW, cy - cardH / 2, cx - dotR - cardGap, cy + cardH / 2],
      }
      items.push({ id: c.id, priority: 0, rect: rects[dir] })
    }
  }

  const offsets = new Map<string, LabelOffset>()
  const placed: Rect[] = []
  const candidates: LabelOffset[] = [
    { x: 0, y: 0 },
    { x: 0, y: -12 },
    { x: 0, y: 12 },
    { x: -12, y: 0 },
    { x: 12, y: 0 },
    { x: -16, y: -10 },
    { x: 16, y: -10 },
    { x: -16, y: 10 },
    { x: 16, y: 10 },
    { x: 0, y: -22 },
    { x: 0, y: 22 },
  ]

  for (const item of items.sort((a, b) => a.priority - b.priority)) {
    let chosen = candidates[0]
    let chosenRect = item.rect
    for (const candidate of candidates) {
      const rect = move(item.rect, candidate)
      if (!placed.some(p => hit(rect, p))) {
        chosen = candidate
        chosenRect = rect
        break
      }
    }
    offsets.set(item.id, chosen)
    placed.push(chosenRect)
  }

  return offsets
}

/* ── 지역별 중심 좌표 ── */
const REGION_CENTERS: Record<string, { lat: number; lng: number }> = {
  // 광역시
  '서울': { lat: 37.5665, lng: 126.9780 },
  '부산': { lat: 35.1796, lng: 129.0756 },
  '대구': { lat: 35.8714, lng: 128.5717 },
  '인천': { lat: 37.4562, lng: 126.7052 },
  '광주': { lat: 35.1260, lng: 126.8313 },
  '대전': { lat: 36.3500, lng: 127.3800 },
  '울산': { lat: 35.5396, lng: 129.3139 },
  // 도
  '경기도 북부': { lat: 37.8000, lng: 127.1500 },
  '경기도 남부': { lat: 36.9000, lng: 127.0500 },
  '강원도': { lat: 37.8000, lng: 128.9000 },
  '충청남도': { lat: 36.6000, lng: 126.7000 },
  '충청북도': { lat: 36.8000, lng: 127.7000 },
  '전라북도': { lat: 35.8300, lng: 127.1300 },
  '전라남도': { lat: 34.8000, lng: 126.8000 },
  '경상북도': { lat: 36.2000, lng: 129.1000 },
  '경상남도': { lat: 35.2000, lng: 128.5000 },
  '제주도': { lat: 33.3886, lng: 126.5626 },
  '세종': { lat: 36.4800, lng: 127.2400 },
}

function getRegionGroup(city: string, theater?: Theater): string {
  // address가 "경기도"로 시작하면 위도로 경기도 남부/북부 판단
  if (theater?.address?.startsWith('경기도')) {
    const lat = theater?.lat ?? 37.5
    return lat >= 37.6 ? '경기도 북부' : '경기도 남부'
  }

  const metropolis = ['서울', '부산', '대구', '인천', '광주', '대전', '울산']
  if (metropolis.includes(city)) return city

  // 경기 북부/남부 분리 (위도 37.6을 기준으로)
  if (city === '경기') {
    const lat = theater?.lat ?? 37.5
    return lat >= 37.6 ? '경기도 북부' : '경기도 남부'
  }

  // 도/특별자치도 매핑 (전체 이름으로 통일)
  const doGroups: Record<string, string> = {
    '강원': '강원도',
    '철원': '강원도',
    '제천': '강원도',
    '충북': '충청북도',
    '충남': '충청남도',
    '전북': '전라북도',
    '전주': '전라북도',
    '전남': '전라남도',
    '목포': '전라남도',
    '경북': '경상북도',
    '경남': '경상남도',
    '창원': '경상남도',
    '밀양': '경상남도',
    '김해': '경상남도',
    '파주': '경기도 북부',
    '안산': '경기도 남부',
    '수원': '경기도 남부',
    '제주': '제주도',
    '세종': '세종',
  }
  return doGroups[city] || city
}

function getRegionCenter(region: string): { lat: number; lng: number } {
  return REGION_CENTERS[region] || { lat: 36.5, lng: 127.5 }
}

/* ── 줌 레벨에서 클러스터링 반경(px) ── */
function clusterRadiusForZoom(zoom: number, isDesktop = false): number {
  if (isDesktop) {
    if (zoom >= 16) return 18
    if (zoom >= 15) return 28
    if (zoom >= 14) return 38
    return 52
  }
  if (zoom >= 16) return 30
  if (zoom >= 15) return 45
  if (zoom >= 14) return 60
  return 80
}

/* ── 줌 레벨별 클러스터 계산 ─────────────────────────────── */
function computeClustersByZoom(
  theaters: Theater[],
  map: LeafletMap,
  zoom: number,
  splitIds: Set<string> = new Set(),
  coLocGroupKey: Map<string, string> = new Map(),
  isDesktop = false,
): TheaterCluster[] {
  // 줌 7-8: 지역별 클러스터링 (지역 중심 좌표 사용)
  if (zoom >= 7 && zoom <= 8) {
    const regionGroups = new Map<string, Theater[]>()
    for (const theater of theaters) {
      const region = getRegionGroup(theater.city, theater)
      if (!regionGroups.has(region)) {
        regionGroups.set(region, [])
      }
      regionGroups.get(region)!.push(theater)
    }

    const clusters: TheaterCluster[] = []
    for (const [region, group] of regionGroups.entries()) {
      const center = getRegionCenter(region)
      clusters.push({
        id: `region-${region}`,
        theaters: group,
        lat: center.lat,
        lng: center.lng,
        isCoLocation: false,
        regionLabel: region,
        clusterCount: group.length,
      })
    }
    return clusters
  }

  // 줌 9-10: 도시별 클러스터링 (광역시만 개별, 나머지는 도/지역으로 묶음)
  if (zoom >= 9 && zoom <= 10) {
    const metropolis = ['서울', '부산', '대구', '인천', '광주', '대전', '울산']
    const groupMap = new Map<string, Theater[]>()

    for (const theater of theaters) {
      let groupKey: string
      // address가 "경기도"로 시작하면 항상 경기도 남부/북부로 분류
      if (theater.address?.startsWith('경기도')) {
        groupKey = getRegionGroup(theater.city, theater)
      } else if (metropolis.includes(theater.city)) {
        groupKey = theater.city
      } else {
        groupKey = getRegionGroup(theater.city, theater)
      }

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, [])
      }
      groupMap.get(groupKey)!.push(theater)
    }

    const clusters: TheaterCluster[] = []
    for (const [groupKey, group] of groupMap.entries()) {
      const center = getRegionCenter(groupKey)
      clusters.push({
        id: `city-${groupKey}`,
        theaters: group,
        lat: center.lat,
        lng: center.lng,
        isCoLocation: false,
        cityLabel: groupKey,
        clusterCount: group.length,
      })
    }
    return clusters
  }

  // 줌 11+: 기존 픽셀 기반 클러스터링
  const radiusPx = clusterRadiusForZoom(zoom, isDesktop)
  const clusterableTheaters = theaters.filter((t) => !splitIds.has(t.id))
  const pts = clusterableTheaters.map((t) => ({
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

    const firstKey = coLocGroupKey.get(group[0].t.id)
    const isCoLocation = group.length > 1 &&
      !!firstKey &&
      group.every((g) => coLocGroupKey.get(g.t.id) === firstKey)

    clusters.push({ id: a.t.id, theaters: group.map((g) => g.t), lat, lng, isCoLocation })
  }

  for (const t of theaters.filter((t) => splitIds.has(t.id))) {
    clusters.push({ id: t.id, theaters: [t], lat: t.lat, lng: t.lng })
  }

  return clusters
}

/* ── 동일 좌표 극장 분리 설정 ───────────────────────────────────── */
// 줌 17~19(마지막 3단계)에서만 분리. 그 아래에선 일반 클러스터로 묶임.
const CO_LOCATE_SPLIT_ZOOM = 17
const CO_LOCATE_PIXEL_RADIUS = 12  // 분리 시 화면 픽셀 반경

// 동일 좌표 그룹을 항상 계산 (줌 무관) — id → 좌표키
// 그룹 키가 같으면 같은 건물
function findCoLocationGroups(theaters: Theater[]): Map<string, string> {
  const key = (t: Theater) => `${t.lat.toFixed(6)},${t.lng.toFixed(6)}`
  const counts = new Map<string, number>()
  for (const t of theaters) counts.set(key(t), (counts.get(key(t)) ?? 0) + 1)
  const result = new Map<string, string>()
  for (const t of theaters) {
    if ((counts.get(key(t)) ?? 0) > 1) result.set(t.id, key(t))
  }
  return result
}

// zoom >= CO_LOCATE_SPLIT_ZOOM 일 때만 픽셀 오프셋 반환.
// 반환된 ID들은 computeClusters에서 일반 클러스터링 대상에서 제외됨.
function computeCoLocationOffsets(
  theaters: Theater[],
  map: LeafletMap,
  zoom: number,
): Map<string, { lat: number; lng: number }> {
  const result = new Map<string, { lat: number; lng: number }>()
  if (zoom < CO_LOCATE_SPLIT_ZOOM) return result

  const key = (t: Theater) => `${t.lat.toFixed(6)},${t.lng.toFixed(6)}`
  const groups = new Map<string, Theater[]>()
  for (const t of theaters) {
    const k = key(t)
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(t)
  }

  for (const group of groups.values()) {
    if (group.length === 1) continue
    const center = group[0]
    const centerPx = map.latLngToContainerPoint([center.lat, center.lng] as [number, number])
    group.forEach((t, idx) => {
      const angle = (2 * Math.PI * idx) / group.length + Math.PI / 4
      const offsetPx = L.point(
        centerPx.x + CO_LOCATE_PIXEL_RADIUS * Math.sin(angle),
        centerPx.y - CO_LOCATE_PIXEL_RADIUS * Math.cos(angle),
      )
      const adjusted = map.containerPointToLatLng(offsetPx)
      result.set(t.id, { lat: adjusted.lat, lng: adjusted.lng })
    })
  }

  return result
}

/* ── 픽셀 거리 기반 클러스터 계산 ─────────────────────────────── */
// splitIds: 줌 >= CO_LOCATE_SPLIT_ZOOM 에서 분리된 ID — 일반 클러스터링 제외
// coLocGroupKey: id → 좌표키 — 클러스터가 순수 동일 건물인지 판별에 사용
function computeClusters(
  theaters: Theater[],
  map: LeafletMap,
  zoom: number,
  splitIds: Set<string> = new Set(),
  coLocGroupKey: Map<string, string> = new Map(),
  isDesktop = false,
): TheaterCluster[] {
  return computeClustersByZoom(theaters, map, zoom, splitIds, coLocGroupKey, isDesktop)
}

/* ── 포스터 겹침 방지 오프셋 계산 ─────────────────────────────── */
// 단일 마커끼리, 또는 단일 포스터와 클러스터 표시 영역이 가로/세로 모두 1/4 이상 겹칠 때만 수평으로 밀어냄
function computePosterOffsets(
  clusters: TheaterCluster[],
  map: LeafletMap,
  zoom: number,
  labelDirections: Map<string, LabelDir> = new Map(),
  posterMoviesByTheater: Map<string, TheaterPosterMovie[]> = new Map(),
  isDesktop = false,
  filtersActive = false,
  labelOffsets: Map<string, LabelOffset> = new Map(),
): Map<string, number> {
  const offsets = new Map<string, number>()

  const { w: pW, h: pH } = posterSizeForZoom(zoom, isDesktop)
  const baseCount = posterCountForZoom(zoom)
  const POSTER_TOP_FROM_PIN = DOT / 2 + 6
  // usePosterLeft 실제 렌더 위치: right:calc(50% + (DOT/2+4)px) from 140px parent
  // → right edge = pinX + 70 - (70 + DOT/2 + 4) = pinX - (DOT/2 + 4)
  const POSTER_LEFT_RE = DOT / 2 + 4            // 15px: right edge from pin center X
  const POSTER_LEFT_TOP = LABEL_H + GAP + DOT - ANCHOR_Y  // 11px: top from pin center Y

  // 극장별 유효 포스터 슬롯 수 — 필터 매칭 시 zoom이 낮아도 최소 1
  const theaterCap = (theaterId: string): number => {
    if (baseCount > 0) return baseCount
    if (filtersActive) {
      const movies = posterMoviesByTheater.get(theaterId) ?? []
      if (movies.length > 0 && movies.some(m => m.matchesFilter)) return 1
    }
    return 0
  }

  // 슬롯 수 → 말풍선 픽셀 크기
  const dimsForCap = (cap: number) => {
    const rc = cap === 6 ? 2 : 1
    const pr = Math.min(cap, 3)
    return {
      w: pr * pW + Math.max(0, pr - 1) * 4 + 16,
      h: pH * rc + 4 * Math.max(0, rc - 1) + 16 + 6,
    }
  }

  type Rect = [number, number, number, number]
  const overlap = (a: Rect, b: Rect) => ({
    x: Math.min(a[2], b[2]) - Math.max(a[0], b[0]),
    y: Math.min(a[3], b[3]) - Math.max(a[1], b[1]),
  })

  // 말풍선이 실제로 보이는 단일 마커 중, 필터 활성 시엔 매칭 극장만 충돌 감지
  // 화면 밖 마커는 어차피 안 보이므로 뷰포트 안의 것만 포함 (여유 200px)
  const mapSize = map.getSize()
  const VP_MARGIN = 200
  const singles = clusters
    .filter((c) => {
      if (c.theaters.length !== 1) return false
      const id = c.theaters[0].id
      const movies = posterMoviesByTheater.get(id) ?? []
      if (movies.length === 0) return false
      if (filtersActive && !movies.some(m => m.matchesFilter)) return false
      return theaterCap(id) > 0
    })
    .map((c) => {
      const px = map.latLngToContainerPoint([c.lat, c.lng] as [number, number])
      const id = c.theaters[0].id
      const name = c.theaters[0].name
      return { id, name, px, cap: theaterCap(id) }
    })
    .filter((s) =>
      Number.isFinite(s.px.x) && Number.isFinite(s.px.y) &&
      s.px.x >= -VP_MARGIN && s.px.x <= mapSize.x + VP_MARGIN &&
      s.px.y >= -VP_MARGIN && s.px.y <= mapSize.y + VP_MARGIN
    )

  if (singles.length === 0) return offsets

  const posterRect = (s: { id: string; name: string; px: LeafletPoint; cap: number }, offset = offsets.get(s.id) ?? 0): Rect => {
    const { w, h } = dimsForCap(s.cap)
    const eff = finiteNumber(offset)
    if (eff < -80) {
      // usePosterLeft: 렌더는 fixed right 위치 사용 — offset 무시하고 실제 위치로 계산
      const re = s.px.x - POSTER_LEFT_RE
      const ty = s.px.y + POSTER_LEFT_TOP
      return [re - w, ty, re, ty + h]
    }
    return [
      s.px.x - w / 2 + eff,
      s.px.y + POSTER_TOP_FROM_PIN,
      s.px.x + w / 2 + eff,
      s.px.y + POSTER_TOP_FROM_PIN + h,
    ]
  }

  // 절반 이상 겹칠 때만 밀어냄
  for (let i = 0; i < singles.length; i++) {
    for (let j = i + 1; j < singles.length; j++) {
      const a = singles[i]
      const b = singles[j]
      const { w: wA, h: hA } = dimsForCap(a.cap)
      const { w: wB, h: hB } = dimsForCap(b.cap)
      const minX = Math.min(wA, wB) / 2
      const minY = Math.min(hA, hB) / 2
      const o = overlap(posterRect(a), posterRect(b))
      if (o.x < minX || o.y < minY) continue
      const shift = o.x / 2 + 8
      const dx = b.px.x - a.px.x
      offsets.set(a.id, (offsets.get(a.id) ?? 0) + (dx >= 0 ? -shift : shift))
      offsets.set(b.id, (offsets.get(b.id) ?? 0) + (dx >= 0 ? shift : -shift))
    }
  }

  const clusterBlockers: { centerX: number; rect: Rect }[] = []

  // 단일 극장 이름표 blocker 추가
  for (const single of singles) {
    const labelDir = labelDirections.get(single.id) ?? 'top'
    const labelOff = labelOffsets.get(single.id) ?? { x: 0, y: 0 }
    const labelW = 140
    const labelH = LABEL_H
    const labelGap = 4

    const labelRect: Record<LabelDir, Rect> = {
      top: [single.px.x - labelW / 2 + labelOff.x, single.px.y - ANCHOR_Y - labelGap - labelH + labelOff.y, single.px.x + labelW / 2 + labelOff.x, single.px.y - ANCHOR_Y - labelGap + labelOff.y],
      bottom: [single.px.x - labelW / 2 + labelOff.x, single.px.y + DOT / 2 + labelGap + labelOff.y, single.px.x + labelW / 2 + labelOff.x, single.px.y + DOT / 2 + labelGap + labelH + labelOff.y],
      right: [single.px.x + DOT / 2 + labelGap + labelOff.x, single.px.y - labelH / 2 + labelOff.y, single.px.x + DOT / 2 + labelGap + labelW + labelOff.x, single.px.y + labelH / 2 + labelOff.y],
      left: [single.px.x - DOT / 2 - labelGap - labelW + labelOff.x, single.px.y - labelH / 2 + labelOff.y, single.px.x - DOT / 2 - labelGap + labelOff.x, single.px.y + labelH / 2 + labelOff.y],
    }
    clusterBlockers.push({ centerX: single.px.x, rect: labelRect[labelDir] })
  }

  for (const c of clusters) {
    if (c.theaters.length <= 1) continue
    const { x: cx, y: cy } = map.latLngToContainerPoint([c.lat, c.lng] as [number, number])
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) continue
    if (cx < -VP_MARGIN || cx > mapSize.x + VP_MARGIN || cy < -VP_MARGIN || cy > mapSize.y + VP_MARGIN) continue

    if (c.theaters.length > 3) {
      clusterBlockers.push({ centerX: cx, rect: [cx - 20, cy - 20, cx + 20, cy + 20] })
      continue
    }

    const dotR = 14
    const cardGap = 8
    const cardW = 180
    const cardH = 18 * c.theaters.length + 12
    const dir = labelDirections.get(c.id) ?? 'top'

    clusterBlockers.push({ centerX: cx, rect: [cx - dotR, cy - dotR, cx + dotR, cy + dotR] })
    const cardRect: Record<LabelDir, Rect> = {
      top: [cx - cardW / 2, cy - dotR - cardGap - cardH, cx + cardW / 2, cy - dotR - cardGap],
      bottom: [cx - cardW / 2, cy + dotR + cardGap, cx + cardW / 2, cy + dotR + cardGap + cardH],
      right: [cx + dotR + cardGap, cy - cardH / 2, cx + dotR + cardGap + cardW, cy + cardH / 2],
      left: [cx - dotR - cardGap - cardW, cy - cardH / 2, cx - dotR - cardGap, cy + cardH / 2],
    }
    clusterBlockers.push({ centerX: cx, rect: cardRect[dir] })
  }

  for (const single of singles) {
    const { w: wS, h: hS } = dimsForCap(single.cap)
    const minX = wS / 2
    const minY = hS / 2
    for (const blocker of clusterBlockers) {
      const rect = posterRect(single)
      const o = overlap(rect, blocker.rect)
      if (o.x < minX || o.y < minY) continue
      const currentOffset = finiteNumber(offsets.get(single.id) ?? 0)
      const direction = (single.px.x + currentOffset) < blocker.centerX ? -1 : 1
      offsets.set(single.id, (offsets.get(single.id) ?? 0) + direction * (o.x - minX + 8))
    }
  }

  return offsets
}

/* ── 클러스터 아이콘 ────────────────────────────────────────────── */
const DIMMED_DOT_LIGHT = '#6b7280'
const DIMMED_DOT_DARK = '#71717a'

function makeClusterIcon(
  theaters: Theater[],
  labelDir: LabelDir = 'top',
  labelOffset: LabelOffset = { x: 0, y: 0 },
  dimmed = false,
  isDark = false,
  regionLabel?: string,
  cityLabel?: string,
  movieCount = 0,
) {
  const dotColor = dimmed ? (isDark ? DIMMED_DOT_DARK : DIMMED_DOT_LIGHT) : 'var(--color-primary-base)'
  const count = theaters.length

  // 줌 7-8: 원 안에 숫자, 말풍선에 지역명
  if (regionLabel) {
    const DOT_SIZE = 50
    const CANVAS_W = 140
    const CANVAS_H = 110
    const CENTER_X = CANVAS_W / 2
    const CENTER_Y = 70
    const BALLOON_GAP = 8
    const DOT_RADIUS = DOT_SIZE / 2

    const balloonStyle =
      `position:absolute;background:var(--color-surface-card);` +
      `border:1.5px solid var(--color-border);border-radius:8px;` +
      `padding:6px 12px;box-shadow:var(--shadow-md);` +
      `white-space:nowrap;font-weight:600;font-size:12px;` +
      `color:var(--color-text-primary);z-index:2;` +
      `top:${CENTER_Y - DOT_RADIUS - BALLOON_GAP - 24}px;left:50%;transform:translateX(-50%);`

    const tailStyle =
      `position:absolute;width:8px;height:8px;background:var(--color-surface-card);` +
      `border-right:1.5px solid var(--color-border);` +
      `border-bottom:1.5px solid var(--color-border);` +
      `transform:rotate(45deg);` +
      `top:${CENTER_Y - DOT_RADIUS - BALLOON_GAP - 5}px;left:50%;transform:translateX(-50%) rotate(45deg);` +
      `z-index:1;pointer-events:none;`

    const html =
      `<div style="position:relative;width:${CANVAS_W}px;height:${CANVAS_H}px;overflow:visible;">` +
      `<div style="${balloonStyle}">${regionLabel}</div>` +
      `<div style="${tailStyle}"></div>` +
      `<div style="position:absolute;width:${DOT_SIZE}px;height:${DOT_SIZE}px;` +
      `top:${CENTER_Y - DOT_SIZE/2}px;left:${CENTER_X - DOT_SIZE/2}px;` +
      `border-radius:50%;background:${dotColor};` +
      `border:2.5px solid var(--color-surface-bg);box-shadow:var(--shadow-md);` +
      `display:flex;align-items:center;justify-content:center;` +
      `color:#fff;font-weight:800;font-size:18px;z-index:3;">${count}</div>` +
      `</div>`

    return L.divIcon({
      html,
      className: '',
      iconSize: [CANVAS_W, CANVAS_H],
      iconAnchor: [CENTER_X, CENTER_Y]
    })
  }

  // 줌 9: 원 안에 숫자, 말풍선에 도시명
  if (cityLabel) {
    const DOT_SIZE = 45
    const CANVAS_W = 120
    const CANVAS_H = 100
    const CENTER_X = CANVAS_W / 2
    const CENTER_Y = 65
    const BALLOON_GAP = 6
    const DOT_RADIUS = DOT_SIZE / 2

    const balloonStyle =
      `position:absolute;background:var(--color-surface-card);` +
      `border:1.5px solid var(--color-border);border-radius:8px;` +
      `padding:4px 10px;box-shadow:var(--shadow-md);` +
      `white-space:nowrap;font-weight:600;font-size:11px;` +
      `color:var(--color-text-primary);z-index:2;` +
      `top:${CENTER_Y - DOT_RADIUS - BALLOON_GAP - 20}px;left:50%;transform:translateX(-50%);`

    const tailStyle =
      `position:absolute;width:6px;height:6px;background:var(--color-surface-card);` +
      `border-right:1.5px solid var(--color-border);` +
      `border-bottom:1.5px solid var(--color-border);` +
      `top:${CENTER_Y - DOT_RADIUS - BALLOON_GAP - 2}px;left:50%;transform:translateX(-50%) rotate(45deg);` +
      `z-index:1;pointer-events:none;`

    const html =
      `<div style="position:relative;width:${CANVAS_W}px;height:${CANVAS_H}px;overflow:visible;">` +
      `<div style="${balloonStyle}">${cityLabel}</div>` +
      `<div style="${tailStyle}"></div>` +
      `<div style="position:absolute;width:${DOT_SIZE}px;height:${DOT_SIZE}px;` +
      `top:${CENTER_Y - DOT_SIZE/2}px;left:${CENTER_X - DOT_SIZE/2}px;` +
      `border-radius:50%;background:${dotColor};` +
      `border:2.5px solid var(--color-surface-bg);box-shadow:var(--shadow-md);` +
      `display:flex;align-items:center;justify-content:center;` +
      `color:#fff;font-weight:800;font-size:16px;z-index:3;">${count}</div>` +
      `</div>`

    return L.divIcon({
      html,
      className: '',
      iconSize: [CANVAS_W, CANVAS_H],
      iconAnchor: [CENTER_X, CENTER_Y]
    })
  }

  const DOT_D = 28
  const DOT_R = DOT_D / 2
  const CARD_GAP = 8
  const CANVAS_W = 220
  const CANVAS_H = 148
  const CENTER_X = CANVAS_W / 2
  const CENTER_Y = CANVAS_H / 2

  if (count <= 3) {
    const LINE_H = 18
    const PY = 6
    const names = theaters.map(t =>
      `<div style="font-size:11px;font-weight:700;font-family:var(--font-display);line-height:${LINE_H}px;` +
      `white-space:nowrap;color:var(--color-text-primary);">${t.name}</div>`
    ).join('')
    const cardStyle =
      `position:relative;background:var(--color-surface-card);` +
      `border:1.5px solid var(--color-border);border-radius:8px;` +
      `padding:${PY}px 10px;box-shadow:var(--shadow-sm);` +
      `display:flex;flex-direction:column;align-items:center;gap:2px;` +
      `z-index:2;`
    const tailBase =
      `position:absolute;width:10px;height:10px;background:var(--color-surface-card);` +
      `pointer-events:none;z-index:1;`
    const tailStyles: Record<LabelDir, string> = {
      bottom: `top:-6px;left:50%;transform:translateX(-50%) rotate(45deg);` +
        `border-top:1.5px solid var(--color-border);border-right:1.5px solid var(--color-border);border-top-right-radius:2px;`,
      top: `bottom:-6px;left:50%;transform:translateX(-50%) rotate(45deg);` +
        `border-bottom:1.5px solid var(--color-border);border-left:1.5px solid var(--color-border);border-bottom-left-radius:2px;`,
      right: `top:50%;left:-6px;transform:translateY(-50%) rotate(45deg);` +
        `border-top:1.5px solid var(--color-border);border-left:1.5px solid var(--color-border);border-top-left-radius:2px;`,
      left: `top:50%;right:-6px;transform:translateY(-50%) rotate(45deg);` +
        `border-right:1.5px solid var(--color-border);border-bottom:1.5px solid var(--color-border);border-bottom-right-radius:2px;`,
    }
    const offset = DOT_R + CARD_GAP
    const cardPos: Record<LabelDir, string> = {
      top: `left:${CENTER_X}px;bottom:${CANVAS_H - CENTER_Y + offset}px;transform:translateX(-50%);`,
      bottom: `left:${CENTER_X}px;top:${CENTER_Y + offset}px;transform:translateX(-50%);`,
      right: `left:${CENTER_X + offset}px;top:${CENTER_Y}px;transform:translateY(-50%);`,
      left: `right:${CANVAS_W - CENTER_X + offset}px;top:${CENTER_Y}px;transform:translateY(-50%);`,
    }
    const wrapperStyle =
      `position:absolute;${cardPos[labelDir]}width:max-content;max-width:180px;z-index:2;` +
      `margin-left:${labelOffset.x}px;margin-top:${labelOffset.y}px;`
    const countTagBelow = movieCount > 0
      ? `<div style="position:absolute;top:${CENTER_Y + DOT_R + 5}px;left:${CENTER_X}px;transform:translateX(-50%);z-index:2;pointer-events:none;">` +
        `<div style="position:absolute;top:-5px;left:50%;transform:translateX(-50%) rotate(45deg);` +
        `width:10px;height:10px;background:var(--color-surface-card);` +
        `border-top:1.5px solid var(--color-border);border-left:1.5px solid var(--color-border);` +
        `border-top-left-radius:2px;z-index:0;"></div>` +
        `<div style="position:relative;background:var(--color-surface-card);` +
        `border:1.5px solid var(--color-border);border-radius:10px;` +
        `padding:3px 8px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.13);z-index:1;">` +
        `<span style="font-size:11px;font-weight:700;color:var(--color-primary-base);">${movieCount}편</span>` +
        `</div></div>`
      : ''
    const html =
      `<div style="position:relative;width:${CANVAS_W}px;height:${CANVAS_H}px;overflow:visible;">` +
      `<div style="${wrapperStyle}">` +
      `<div style="${tailBase}${tailStyles[labelDir]}"></div>` +
      `<div style="${cardStyle}">${names}</div>` +
      `</div>` +
      `<div style="position:absolute;width:${DOT_D}px;height:${DOT_D}px;` +
      `top:${CENTER_Y - DOT_R}px;left:${CENTER_X - DOT_R}px;` +
      `border-radius:50%;background:${dotColor};` +
      `border:2px solid var(--color-surface-bg);box-shadow:var(--shadow-sm);` +
      `display:flex;align-items:center;justify-content:center;` +
      `color:#fff;font-weight:700;font-size:12px;z-index:1;">${count}</div>` +
      countTagBelow +
      `</div>`

    return L.divIcon({
      html,
      className: '',
      iconSize: [CANVAS_W, CANVAS_H],
      iconAnchor: [CENTER_X, CENTER_Y],
    })
  }

  // count > 3: 원형 + 태그
  const SIZE = 40
  const TAG_H = movieCount > 0 ? 32 : 0
  const CW = 100, CH = SIZE + TAG_H + 8
  const cx = CW / 2, cy = SIZE / 2
  const countTagLarge = movieCount > 0
    ? `<div style="position:absolute;top:${SIZE + 4}px;left:${cx}px;transform:translateX(-50%);z-index:2;pointer-events:none;">` +
      `<div style="position:absolute;top:-5px;left:50%;transform:translateX(-50%) rotate(45deg);` +
      `width:10px;height:10px;background:var(--color-surface-card);` +
      `border-top:1.5px solid var(--color-border);border-left:1.5px solid var(--color-border);` +
      `border-top-left-radius:2px;z-index:0;"></div>` +
      `<div style="position:relative;background:var(--color-surface-card);` +
      `border:1.5px solid var(--color-border);border-radius:10px;` +
      `padding:3px 8px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.13);z-index:1;">` +
      `<span style="font-size:11px;font-weight:700;color:var(--color-text-primary);">${movieCount}편</span>` +
      `</div></div>`
    : ''
  const html =
    `<div style="position:relative;width:${CW}px;height:${CH}px;overflow:visible;">` +
    `<div style="position:absolute;width:${SIZE}px;height:${SIZE}px;` +
    `top:0;left:${cx - SIZE / 2}px;` +
    `border-radius:50%;background:${dotColor};` +
    `display:flex;align-items:center;justify-content:center;` +
    `color:#fff;font-weight:700;font-size:16px;line-height:1;` +
    `box-shadow:var(--shadow-md);border:2.5px solid var(--color-surface-bg);">${count}</div>` +
    countTagLarge +
    `</div>`
  return L.divIcon({ html, className: '', iconSize: [CW, CH], iconAnchor: [cx, cy] })
}

/* ── 클러스터가 분리되는 최소 줌 계산 ── */
function findSplitZoom(
  theaters: Theater[],
  map: LeafletMap,
  currentZoom: number,
  isDesktop = false,
): number {
  for (let z = currentZoom + 1; z <= 19; z++) {
    const radius = clusterRadiusForZoom(z, isDesktop)
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

export default function MapView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { state: locPermState, coords, request: locRequest, dismiss: locDismiss, refetch } = useLocationPermission()
  const isDark = useIsDark()
  const isDesktopLayout = useIsDesktopLayout()
  const { setTheme } = useThemeStore()
  const { data: theaters = [], isLoading: theatersLoading } = useTheaters()
  const { data: stations = [] } = useStations()
  const { data: movies = [] } = useMovies()
  const { data: activeMovieIds = [] } = useActiveMovieIds()
  const [filters, setFilters] = useState<FilterState>({
    dateId: 'this-week',
    customStart: null,
    customEnd: null,
    genres: [],
    nations: [],
    bookable: false,
    indie: false,
    regionId: null,
  })
  const [movieFilter, setMovieFilter] = useState<{ id: string; title: string } | null>(null)
  const [directorFilter, setDirectorFilter] = useState<{ name: string } | null>(null)
  const [panelStack, setPanelStack] = useState<DesktopPanelState[]>([])
  const desktopPanel = panelStack[panelStack.length - 1] ?? null
  const [panelIn, setPanelIn] = useState(false)          // CSS transition 트리거
  const [panelExiting, setPanelExiting] = useState(false)
  const [displayedPanel, setDisplayedPanel] = useState<DesktopPanelState | null>(null)
  const panelExitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const selectedDateRange = useMemo(() => dateRangeForFilter(filters), [filters])
  const mapShowtimeStart = formatDateParam(selectedDateRange.start)
  const mapShowtimeEnd = formatDateParam(selectedDateRange.end)
  const { data: mapShowtimes = [] } = useMapShowtimes(mapShowtimeStart, mapShowtimeEnd)
  const mapRef = useRef<LeafletMap | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedIdRef = useRef<string | null>(null)
  selectedIdRef.current = selectedId
  const [fromMovieId, setFromMovieId] = useState<string | null>(null)
  const [initialSheetDate, setInitialSheetDate] = useState<string | undefined>(undefined)
  const suppressMovieFilterFitRef = useRef(false)
  const [zoom, setZoom] = useState(14)
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null)
  const [subwayLayerReady, setSubwayLayerReady] = useState(false)
  const zoomRef = useRef(14)
  const recomputeRef = useRef<(() => void) | null>(null)
  const subwayLayerVisibleRef = useRef(false)
  const subwayLayerDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const viewportRecomputeDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // 모바일에서는 포스터 호버 정보 표시 안함
    if (!isDesktopLayout) return

    const handleOver = (e: Event) => {
      const target = e.target as HTMLElement | null
      const wrap = target?.closest('.pm-wrap, .po-wrap') as HTMLElement | null
      if (!wrap) return
      const isPm = wrap.classList.contains('pm-wrap')
      const rect = wrap.getBoundingClientRect()
      const tipW = isPm ? 200 : 280  // gap(10) + tooltip width
      // 우측엔 더 이상 떠있는 패널이 없음(좌측 도크로 이전) — 화면 우측 끝 기준으로만 판단
      wrap.classList.toggle('tip-l', rect.right + tipW > window.innerWidth)
    }
    // leaflet-container가 mount된 뒤 부착 (MapRefSetter가 먼저 실행됨)
    const container = document.querySelector('.leaflet-container')
    if (!container) return
    container.addEventListener('mouseover', handleOver)
    return () => container.removeEventListener('mouseover', handleOver)
  }, [isDesktopLayout])

  // 검색 오버레이 — 데스크톱은 좌측 레일의 검색 버튼으로도 토글되므로 공유 스토어 사용
  const searchOpen = useUIStore((s) => s.isSearchOpen)
  const setSearchOpen = useUIStore((s) => s.setSearchOpen)
  const [searchQuery, setSearchQuery] = useState('')
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const searchInputRef = useRef<HTMLInputElement>(null)

  const dummyInputRef = useRef<HTMLInputElement>(null)
  const settingsOpen = useUIStore((s) => s.isSettingsOpen)
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen)
  // 큐레이션에서 선택한 영화 — MovieSheet를 띄움. null이면 닫힘
  const [movieSheetId, setMovieSheetId] = useState<string | null>(null)
  // 모바일 큐레이션 시트 — peek(최소, 기본값) ↔ expanded 2단. visibleHeight는 +/- · 현위치 FAB 위치 계산용
  const [curationSnap, setCurationSnap] = useState<CurationSnap>('peek')
  const [curationVisibleHeight, setCurationVisibleHeight] = useState(0)
  const handleCurationSnapChange = useCallback((snap: CurationSnap, visibleHeight: number) => {
    setCurationSnap(snap)
    setCurationVisibleHeight(visibleHeight)
  }, [])
  // 시트가 expanded 상태일 때 지도 조작(터치·드래그·줌·현위치)이 들어오면 가장 아래로 접어 시야 확보
  const collapseCurationOnMapInteraction = useCallback(() => {
    setCurationSnap((prev) => (prev === 'expanded' ? 'peek' : prev))
  }, [])
  // 데스크톱 좌측 도크 — 접힘 토글. 전역 스토어에 둬서 GlobalNav '지도' 탭 재클릭으로도 같은 슬라이드 애니메이션으로 토글 가능
  const dockCollapsed = useUIStore((s) => s.isMapDockCollapsed)
  const setDockCollapsed = useUIStore((s) => s.setMapDockCollapsed)
  const toggleDockCollapsed = useUIStore((s) => s.toggleMapDockCollapsed)
  // 검색 패널 슬라이드 — 도크에 다른 시트(극장/영화·감독 상세)가 없는 채로 열렸을 때만 좌측에서 슬라이드 인/아웃,
  // 다른 시트가 떠 있는 채로 열렸을 땐 그 위에 바로 겹쳐 표시(애니메이션 없음). 열리는 순간의 상태로 고정해 도중에 바뀌어도 흔들리지 않게 함
  const [searchSlideMode, setSearchSlideMode] = useState(false)
  const [displayedSearchOpen, setDisplayedSearchOpen] = useState(false)
  const [searchIn, setSearchIn] = useState(false)
  const searchExitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const desktopDockHidden = isDesktopLayout && dockCollapsed && !searchOpen
  // 도크/검색 패널이 차지하는 폭만큼 비킨 지점 — 칩·로고 등 오버레이를 그 오른쪽에 배치할 때 기준 (도크 접히면 줄어듦)
  const desktopContentStart = GLOBAL_NAV_DESKTOP_WIDTH + (desktopDockHidden ? 0 : DESKTOP_DOCK_WIDTH)
  // 데스크톱: 좌측 도크에 항상 노출 / 모바일: 시트가 항상 떠 있음 — 레이아웃 무관하게 항상 로드
  const curationData = useCurationData(true)
  const mapViewTrackedRef = useRef(false)
  const lastSearchTelemetryRef = useRef('')
  const lastFilterTelemetryRef = useRef('')

  useEffect(() => {
    if (mapViewTrackedRef.current || theatersLoading) return
    mapViewTrackedRef.current = true
    trackEvent('map viewed', {
      theater_count: theaters.length,
      movie_count: movies.length,
      source: searchParams.has('theater')
        ? 'direct_link'
        : searchParams.has('movie') || searchParams.has('director')
          ? 'movie_detail'
          : 'direct',
    })
  }, [movies.length, theaters.length, theatersLoading, searchParams])

  useEffect(() => { setRecentSearches(loadRecentSearches()) }, [])
  useEffect(() => {
    try {
      const stored = localStorage.getItem('movie-app-theme')
      if (stored === 'light' || stored === 'dark' || stored === 'system') void setTheme(stored)
    } catch {}
  }, [setTheme])

  // PC 패널 브라우저 히스토리 베이스라인 — 마운트 시 현재 엔트리에 빈 스택 기록
  useEffect(() => {
    window.history.replaceState({ panelStack: [] }, '')
  }, [])

  // 브라우저 뒤로/앞으로 → 패널 스택 동기화
  useEffect(() => {
    const handler = (e: PopStateEvent) => {
      const stack: DesktopPanelState[] = e.state?.panelStack ?? []
      setPanelStack(stack)
    }
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  // 좌측 도크가 접혀있는 상태에서 극장이 선택되면 — 도크를 펼쳐 극장 상세가 슬라이드 인 되도록 강제로 열고,
  // 선택 직전의 접힘 상태를 기억해뒀다가 극장 상세를 닫을 때 그 상태로 되돌린다
  const dockCollapsedBeforeTheaterRef = useRef<boolean | null>(null)
  useEffect(() => {
    if (!isDesktopLayout) return
    if (selectedId !== null) {
      if (dockCollapsedBeforeTheaterRef.current === null) {
        dockCollapsedBeforeTheaterRef.current = dockCollapsed
        if (dockCollapsed) setDockCollapsed(false)
      }
    } else if (dockCollapsedBeforeTheaterRef.current !== null) {
      if (dockCollapsedBeforeTheaterRef.current) setDockCollapsed(true)
      dockCollapsedBeforeTheaterRef.current = null
    }
  }, [isDesktopLayout, selectedId, dockCollapsed, setDockCollapsed])

  // PC ESC 키 → 검색 닫기 → 패널 한 단계 뒤로 → 시트 닫기
  useEffect(() => {
    if (!isDesktopLayout) return
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (searchOpen) {
        setSearchOpen(false)
        setSearchQuery('')
      } else if (panelStack.length > 0) {
        window.history.back()
      } else if (selectedId) {
        setSelectedId(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isDesktopLayout, searchOpen, panelStack.length, selectedId])

  const openDesktopPanel = useCallback((state: DesktopPanelState) => {
    setPanelStack((prev) => {
      const next = [...prev, state]
      window.history.pushState({ panelStack: next }, '')
      return next
    })
  }, [])

  const closeDesktopPanel = useCallback(() => {
    setPanelStack((prev) => {
      if (prev.length > 0) window.history.go(-prev.length)
      return []
    })
  }, [])

  // 데스크톱: DesktopDetailPanel 재사용(검색과 동일) / 모바일: MovieSheet
  const handleCurationMovieSelect = useCallback((movieId: string, movieTitle: string) => {
    trackEvent('curation movie selected', {
      movie_id: movieId,
      movie_title: movieTitle,
      source: 'curation_sheet',
    })
    classifySessionIntent('type_a', { source: 'curation_sheet', movie_id: movieId })
    if (isDesktopLayout) {
      openDesktopPanel({ type: 'movie', id: movieId })
    } else {
      setCurationSnap('peek')
      setMovieSheetId(movieId)
    }
  }, [isDesktopLayout, openDesktopPanel])

  // 패널 열기/닫기 슬라이드 애니메이션
  useEffect(() => {
    if (panelExitTimerRef.current) clearTimeout(panelExitTimerRef.current)
    if (desktopPanel) {
      setDisplayedPanel(desktopPanel)
      setPanelIn(false)
      setPanelExiting(false)
      // 두 번 중첩 RAF: 첫 번째에서 마운트 paint, 두 번째에서 transition 시작
      let id = requestAnimationFrame(() => {
        id = requestAnimationFrame(() => setPanelIn(true))
      })
      return () => cancelAnimationFrame(id)
    } else {
      setPanelIn(false)
      setPanelExiting(true)
      panelExitTimerRef.current = setTimeout(() => {
        setDisplayedPanel(null)
        setPanelExiting(false)
      }, 200)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desktopPanel])

  // 검색 패널 슬라이드 인/아웃 — 도크가 비어 있는 채로 열렸을 때만 적용(슬라이드 모드는 여는 순간 결정/고정됨)
  useEffect(() => {
    if (searchExitTimerRef.current) clearTimeout(searchExitTimerRef.current)
    if (searchOpen) {
      setDisplayedSearchOpen(true)
      if (searchSlideMode) {
        setSearchIn(false)
        let id = requestAnimationFrame(() => {
          id = requestAnimationFrame(() => setSearchIn(true))
        })
        return () => cancelAnimationFrame(id)
      }
      setSearchIn(true)
    } else if (searchSlideMode) {
      setSearchIn(false)
      searchExitTimerRef.current = setTimeout(() => {
        setDisplayedSearchOpen(false)
      }, 220)
    } else {
      setDisplayedSearchOpen(false)
      setSearchIn(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchOpen])

  const openSearch = useCallback(() => {
    trackEvent('search opened', { source: 'map' })
    // 도크가 비어 있을 때(다른 시트 없음)만 좌측 슬라이드 — 여는 순간 상태로 고정
    // (selectedTheater/displayedPanel은 이 함수보다 뒤에 선언되어 deps에 못 넣으므로 동치인 selectedId/desktopPanel로 판단)
    setSearchSlideMode(isDesktopLayout && selectedId === null && desktopPanel === null)
    // iOS Safari: 키보드는 반드시 클릭 핸들러 안에서 동기적으로 focus()가 불려야 열림
    // 1) 클릭 핸들러 동기 컨텍스트 안에서 hidden dummy input 포커스 → iOS가 키보드 세션 시작
    dummyInputRef.current?.focus()
    // 2) 상태 업데이트 → 오버레이 마운트
    setSearchOpen(true)
    // 3) 오버레이 렌더 후 진짜 인풋으로 포커스 이동 (키보드 세션이 이미 열려있으므로 유지됨)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => searchInputRef.current?.focus())
    })
  }, [isDesktopLayout, selectedId, desktopPanel])

  const closeSearch = useCallback(() => {
    setSearchOpen(false)
    setSearchQuery('')
  }, [])

  // 검색 패널이 닫히면 항상 검색어 초기화 — 좌측 레일의 검색 버튼으로 닫혔을 때도 적용
  useEffect(() => {
    if (!searchOpen) setSearchQuery('')
  }, [searchOpen])

  const stationResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    return stations
      .map((station) => ({ station, score: stationSearchScore(station, searchQuery) }))
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score || a.station.name.localeCompare(b.station.name, 'ko'))
      .slice(0, 20)
      .map((result) => result.station)
  }, [searchQuery, stations])

  const visibleStations = useMemo(() => {
    if (!mapBounds || zoom < STATION_PIN_MIN_ZOOM || !subwayLayerReady) return []
    const paddedBounds = mapBounds.pad(STATION_BOUNDS_PADDING)
    return stations.filter((station) => paddedBounds.contains([station.lat, station.lng]))
  }, [mapBounds, stations, subwayLayerReady, zoom])

  const theaterResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    return theaters
      .map((theater) => ({ theater, score: theaterSearchScore(theater, searchQuery) }))
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score || a.theater.name.localeCompare(b.theater.name, 'ko'))
      .slice(0, 20)
      .map((result) => result.theater)
  }, [searchQuery, theaters])

  const activeMovieIdSet = useMemo(() => new Set(activeMovieIds), [activeMovieIds])
  const nationOptions = useMemo(() => {
    const counts = new Map<string, number>()
    for (const movie of movies) {
      if (!movie.nation) continue
      for (const n of movie.nation.split(/[,，/·]+/).map(s => s.trim()).filter(Boolean)) {
        counts.set(n, (counts.get(n) ?? 0) + 1)
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'))
      .map(([n]) => n)
  }, [movies])

  // 극장 주소에서 구 단위 지역 파생 (추가 DB 없이 자동완성 + 인근 극장 제공)
  const derivedAreas = useMemo(() => {
    // 극장 주소에서 구 단위 실제 좌표 + 극장 목록 파생
    const theaterByGu = new Map<string, { lat: number; lng: number; n: number; theaters: Theater[] }>()
    for (const t of theaters) {
      const match = t.address.match(/([가-힣]+[구])/)
      if (!match) continue
      const name = match[1]
      const d = theaterByGu.get(name) ?? { lat: 0, lng: 0, n: 0, theaters: [] }
      d.lat += t.lat; d.lng += t.lng; d.n++
      d.theaters.push(t)
      theaterByGu.set(name, d)
    }

    type AreaItem = { name: string; lat: number; lng: number; theaters: Theater[]; aliases: string[] }
    const result = new Map<string, AreaItem>()

    // 정적 구 데이터 (극장 있으면 실제 좌표로 덮어씀)
    for (const entry of SEOUL_GU) {
      const d = theaterByGu.get(entry.name)
      result.set(entry.name, {
        name: entry.name,
        lat: d ? d.lat / d.n : entry.lat,
        lng: d ? d.lng / d.n : entry.lng,
        theaters: d?.theaters ?? [],
        aliases: entry.aliases ?? [],
      })
    }

    // 정적 동네 데이터 (별칭 포함)
    for (const entry of SEOUL_DONG) {
      if (!result.has(entry.name)) {
        result.set(entry.name, {
          name: entry.name,
          lat: entry.lat,
          lng: entry.lng,
          theaters: [],
          aliases: entry.aliases ?? [],
        })
      }
    }

    return Array.from(result.values())
  }, [theaters])

  const areaResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    return derivedAreas
      .map(area => ({
        area,
        score: Math.max(
          areaSearchScore(area.name, searchQuery),
          ...area.aliases.map(a => areaSearchScore(a, searchQuery)),
        ),
      }))
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score || a.area.name.localeCompare(b.area.name, 'ko'))
      .map(r => r.area)
  }, [searchQuery, derivedAreas])

  const theaterPosterMovies = useMemo(() => {
    const byTheater = new Map<string, Map<string, TheaterPosterMovie>>()
    // 호버 시간표: 선택 날짜 범위 첫날 기준
    const todayShowtimes = new Map<string, Map<string, Array<{ time: string; soldout: boolean; past: boolean }>>>()

    for (const showtime of mapShowtimes) {
      if (!showtime.movie) continue

      let theaterMovies = byTheater.get(showtime.theaterId)
      if (!theaterMovies) {
        theaterMovies = new Map()
        byTheater.set(showtime.theaterId, theaterMovies)
      }

      const hasSeats = showtime.seatAvailable > 0
      const current = theaterMovies.get(showtime.movieId)
      if (current) {
        current.showtimeCount += 1
        if (hasSeats) current.hasAvailableSeats = true
      } else {
        const matchesMovieFilter = !movieFilter || showtime.movieId === movieFilter.id
        const matchesDirectorFilter = !directorFilter || showtime.movie.director.includes(directorFilter.name)
        const matchesGenre = filters.genres.length === 0 || showtime.movie.genre.some(g => {
          const normalized = normalizeGenre(g)
          return normalized !== null && filters.genres.includes(normalized)
        })
        const matchesNation = (() => {
          if (filters.nations.length === 0) return true
          const ns = showtime.movie.nation?.split(/[,，/·]+/).map(s => s.trim()).filter(Boolean) ?? []
          return ns.some(n => filters.nations.includes(n))
        })()
        theaterMovies.set(showtime.movieId, {
          id: showtime.movie.id,
          title: showtime.movie.title,
          posterUrl: showtime.movie.posterUrl,
          genre: showtime.movie.genre,
          nation: showtime.movie.nation,
          director: showtime.movie.director,
          showtimeCount: 1,
          hasAvailableSeats: hasSeats,
          matchesFilter: matchesMovieFilter && matchesDirectorFilter && matchesGenre && matchesNation,
        })
      }

      // 첫날 시간 수집 (호버 tip용)
      if (showtime.showDate === mapShowtimeStart) {
        let tMap = todayShowtimes.get(showtime.theaterId)
        if (!tMap) { tMap = new Map(); todayShowtimes.set(showtime.theaterId, tMap) }
        const list = tMap.get(showtime.movieId) ?? []
        const [th, tm] = showtime.showTime.split(':').map(Number)
        const nowNow = new Date()
        const nowNowMins = nowNow.getHours() * 60 + nowNow.getMinutes()
        list.push({ time: showtime.showTime.slice(0, 5), soldout: showtime.seatAvailable === 0, past: th * 60 + tm < nowNowMins })
        tMap.set(showtime.movieId, list)
      }
    }

    const result = new Map<string, TheaterPosterMovie[]>()
    for (const [theaterId, movieMap] of byTheater) {
      for (const movie of movieMap.values()) {
        if (filters.bookable && !movie.hasAvailableSeats) movie.matchesFilter = false
        const times = todayShowtimes.get(theaterId)?.get(movie.id)
        if (times?.length) movie.showtimesToday = times
      }
      result.set(
        theaterId,
        Array.from(movieMap.values()).sort((a, b) =>
          b.showtimeCount - a.showtimeCount || a.title.localeCompare(b.title, 'ko')
        ),
      )
    }
    return result
  }, [directorFilter, filters.bookable, filters.genres, filters.nations, movieFilter, mapShowtimes, mapShowtimeStart])

  const filtersActive = filters.bookable || filters.genres.length > 0 || filters.nations.length > 0 || !!movieFilter || !!directorFilter
  const filterResultCount = useMemo(() => {
    if (!filtersActive) return theaters.length
    let count = 0
    for (const theater of theaters) {
      if ((theaterPosterMovies.get(theater.id) ?? []).some((movie) => movie.matchesFilter)) count += 1
    }
    return count
  }, [filtersActive, theaterPosterMovies, theaters])

  useEffect(() => {
    const signature = JSON.stringify({
      dateId: filters.dateId,
      customStart: filters.customStart ? formatDateParam(filters.customStart) : null,
      customEnd: filters.customEnd ? formatDateParam(filters.customEnd) : null,
      genres: filters.genres,
      nations: filters.nations,
      bookable: filters.bookable,
      movieId: movieFilter?.id,
      directorName: directorFilter?.name,
      resultCount: filterResultCount,
    })
    if (!lastFilterTelemetryRef.current) {
      lastFilterTelemetryRef.current = signature
      return
    }
    if (lastFilterTelemetryRef.current === signature) return
    lastFilterTelemetryRef.current = signature

    trackEvent('map filter changed', {
      date_id: filters.dateId,
      custom_start: filters.customStart ? formatDateParam(filters.customStart) : null,
      custom_end: filters.customEnd ? formatDateParam(filters.customEnd) : null,
      genres: filters.genres,
      genres_count: filters.genres.length,
      nations: filters.nations,
      nations_count: filters.nations.length,
      bookable: filters.bookable,
      movie_filter_id: movieFilter?.id,
      movie_filter_title: movieFilter?.title,
      director_filter_name: directorFilter?.name,
      filter_result_count: filterResultCount,
      is_zero_result: filterResultCount === 0,
    })
  }, [directorFilter, filterResultCount, filters.bookable, filters.customEnd, filters.customStart, filters.dateId, filters.genres, filters.nations, movieFilter])

  // 상영일정·예매가능 제외한 검색 필터가 활성화 됐을 때 — 해당 극장은 클러스터링 제외
  const searchMatchedTheaterIds = useMemo(() => {
    const isSearchFilter = !!movieFilter || !!directorFilter || filters.genres.length > 0 || filters.nations.length > 0
    if (!isSearchFilter) return new Set<string>()
    const ids = new Set<string>()
    for (const [theaterId, movies] of theaterPosterMovies) {
      if (movies.some(m => m.matchesFilter)) ids.add(theaterId)
    }
    return ids
  }, [directorFilter, movieFilter, filters.genres, filters.nations, theaterPosterMovies])

  const titleMovieResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    return movies
      .map((movie) => ({ movie, score: movieSearchScore(movie, searchQuery) }))
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score || a.movie.title.localeCompare(b.movie.title, 'ko'))
      .slice(0, 20)
      .map((result) => result.movie)
  }, [movies, searchQuery])

  const directorResults = useMemo(() => {
    if (!searchQuery.trim()) return []

    const byDirector = new Map<string, { name: string; score: number; movies: Movie[] }>()
    for (const movie of movies) {
      for (const director of movie.director) {
        const score = directorSearchScore(director, searchQuery)
        if (score <= 0) continue
        const current = byDirector.get(director) ?? { name: director, score, movies: [] }
        current.score = Math.max(current.score, score)
        current.movies.push(movie)
        byDirector.set(director, current)
      }
    }

    return Array.from(byDirector.values())
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'ko'))
      .slice(0, 20)
  }, [movies, searchQuery])

  const relatedDirectorResults = useMemo(() => {
    if (titleMovieResults.length === 0 || titleMovieResults.length > SEARCH_CROSS_RESULT_LIMIT) {
      return directorResults
    }

    const byDirector = new Map<string, { name: string; score: number; movies: Movie[] }>()
    for (const result of directorResults) {
      byDirector.set(result.name, { ...result, movies: [...result.movies] })
    }
    for (const movie of titleMovieResults) {
      for (const director of movie.director) {
        const current = byDirector.get(director) ?? { name: director, score: 0, movies: [] }
        if (!current.movies.some((m) => m.id === movie.id)) current.movies.push(movie)
        byDirector.set(director, current)
      }
    }

    return Array.from(byDirector.values())
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'ko'))
      .slice(0, 20)
  }, [directorResults, titleMovieResults])

  const movieResults = useMemo(() => {
    const byMovie = new Map<string, Movie>()
    for (const movie of titleMovieResults) byMovie.set(movie.id, movie)

    if (directorResults.length > 0 && directorResults.length <= SEARCH_CROSS_RESULT_LIMIT) {
      for (const director of directorResults) {
        for (const movie of director.movies) byMovie.set(movie.id, movie)
      }
    }

    return Array.from(byMovie.values()).sort((a, b) => {
      const titleScoreDiff = movieSearchScore(b, searchQuery) - movieSearchScore(a, searchQuery)
      if (titleScoreDiff !== 0) return titleScoreDiff
      return a.title.localeCompare(b.title, 'ko')
    }).slice(0, 20)
  }, [directorResults, searchQuery, titleMovieResults])

  const searchSections = useMemo(() => {
    const bestMovieScore = Math.max(0, ...titleMovieResults.map((movie) => movieSearchScore(movie, searchQuery)))
    const bestDirectorScore = Math.max(0, ...directorResults.map((director) => director.score))
    const bestStationScore = Math.max(0, ...stationResults.map((station) => stationSearchScore(station, searchQuery)))
    const bestTheaterScore = Math.max(0, ...theaterResults.map((theater) => theaterSearchScore(theater, searchQuery)))
    const bestAreaScore = Math.max(0, ...areaResults.map(a => Math.max(areaSearchScore(a.name, searchQuery), ...a.aliases.map(al => areaSearchScore(al, searchQuery)))))
    return [
      { id: 'theaters', score: bestTheaterScore, priority: 0 },
      { id: 'movies', score: bestMovieScore, priority: 1 },
      { id: 'directors', score: bestDirectorScore, priority: 2 },
      { id: 'stations', score: bestStationScore, priority: 3 },
      { id: 'areas', score: bestAreaScore, priority: 4 },
    ]
      .filter((section) => section.score > 0)
      .sort((a, b) => b.score - a.score || a.priority - b.priority)
      .map((section) => section.id)
  }, [areaResults, directorResults, searchQuery, stationResults, theaterResults, titleMovieResults])

  const focusStation = useCallback((station: Station) => {
    trackEvent('search result selected', {
      result_type: 'station',
      result_id: station.id,
      result_name: station.name,
      search_term: searchQuery.trim(),
    })
    setRecentSearches(prev => addToRecent(searchQuery, prev))
    closeSearch()
    setSelectedId(null)
    setDisplayedId(null)
    setSheetExpanded(false)
    if (mapRef.current) springFlyTo(mapRef.current, [station.lat, station.lng], 16)
  }, [closeSearch, searchQuery])

  const focusArea = useCallback((area: { name: string; lat: number; lng: number }) => {
    trackEvent('search result selected', {
      result_type: 'area',
      result_id: area.name,
      result_name: area.name,
      search_term: searchQuery.trim(),
    })
    setRecentSearches(prev => addToRecent(searchQuery, prev))
    closeSearch()
    setSelectedId(null)
    setDisplayedId(null)
    setSheetExpanded(false)
    if (mapRef.current) springFlyTo(mapRef.current, [area.lat, area.lng], 15)
  }, [closeSearch, searchQuery])

  // 바텀시트 상태
  const [sheetExpanded, setSheetExpanded] = useState(false)
  const [selectedMovieId, setSelectedMovieId] = useState('')
  const [sheetExiting, setSheetExiting] = useState(false)
  const [theaterOffScreen, setTheaterOffScreen] = useState(false)
  // displayedId: 퇴장 애니메이션 중에도 이전 극장을 유지하기 위한 지연 참조
  const [displayedId, setDisplayedId] = useState<string | null>(null)
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const defaultCenter: [number, number] = [37.5665, 126.978]
  const selectedTheater = theaters.find((t) => t.id === (displayedId ?? selectedId)) ?? null

  const clearTheaterSelection = useCallback(() => {
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current)
    setSelectedId(null)
    setDisplayedId(null)
    setSelectedMovieId('')
    setSheetExpanded(false)
    setSheetExiting(false)
    setFromMovieId(null)
    setInitialSheetDate(undefined)
  }, [])

  const applyDirectorFilter = useCallback((name: string) => {
    suppressMovieFilterFitRef.current = false
    clearTheaterSelection()
    setMovieFilter(null)
    setDirectorFilter({ name })
  }, [clearTheaterSelection])

  /* ── 클러스터 & 오프셋 ── */
  const [clusters, setClusters] = useState<TheaterCluster[]>([])
  const [posterOffsets, setPosterOffsets] = useState<Map<string, number>>(new Map())
  // 동일 좌표 극장의 픽셀 고정 오프셋 (줌 변경 시마다 재계산)
  const [coLocationOffsets, setCoLocationOffsets] = useState<Map<string, { lat: number; lng: number }>>(new Map())
  const [labelDirections, setLabelDirections] = useState<Map<string, LabelDir>>(new Map())
  const [labelOffsets, setLabelOffsets] = useState<Map<string, LabelOffset>>(new Map())

  const recompute = useCallback(() => {
    if (springActive) return  // 스프링 중 마커 레이아웃 재계산 방지 (번쩍임)
    const map = mapRef.current
    if (!map) return
    if (!isMapProjectionReady(map)) return
    const z = zoomRef.current
    const coLocGroups = findCoLocationGroups(theaters)
    const coLoc = computeCoLocationOffsets(theaters, map, z)
    // 동일좌표 분리 대상 + 검색 매칭 극장(클러스터 제외)
    const splitIds = new Set([...coLoc.keys(), ...searchMatchedTheaterIds])
    // 분리 대상은 오프셋 적용 좌표로 교체 후 클러스터 계산
    const adjustedTheaters = theaters.map((t) => {
      const off = coLoc.get(t.id)
      return off ? { ...t, lat: off.lat, lng: off.lng } : t
    })
    const c = computeClusters(adjustedTheaters, map, z, splitIds, coLocGroups, isDesktopLayout)
    const d = computeLabelDirections(c, map)
    const labelO = computeNameLabelOffsets(c, map, d)
    const o = computePosterOffsets(c, map, z, d, theaterPosterMovies, isDesktopLayout, filtersActive, labelO)
    setClusters(c)
    setPosterOffsets(o)
    setCoLocationOffsets(coLoc)
    setLabelDirections(d)
    setLabelOffsets(labelO)
    setMapBounds(map.getBounds())
    setZoom(z)
  }, [theaters, theaterPosterMovies, isDesktopLayout, searchMatchedTheaterIds, filtersActive])

  // recomputeRef: ViewportTracker 이벤트 핸들러에서 항상 최신 recompute를 참조
  recomputeRef.current = recompute
  // 스프링 정착 시 즉시 recompute 실행 (handleViewport의 80ms 지연 대신)
  setSpringSettledCallback(() => recomputeRef.current?.())

  const handleViewport = useCallback(({ zoom: z, bounds }: { zoom: number; bounds: L.LatLngBounds }) => {
    zoomRef.current = z
    // 스프링 애니메이션 중에는 React 상태 업데이트 건너뜀 (60fps setView가 moveend를 연발하므로)
    // 스프링 종료 시 마지막 setView가 moveend를 한 번 발생시켜 여기서 정상 동기화됨
    if (springActive) return
    setMapBounds(bounds)

    const shouldShowSubway = z >= STATION_PIN_MIN_ZOOM
    if (subwayLayerDelayRef.current) {
      clearTimeout(subwayLayerDelayRef.current)
      subwayLayerDelayRef.current = null
    }

    if (!shouldShowSubway) {
      subwayLayerVisibleRef.current = false
      setSubwayLayerReady(false)
    } else if (!subwayLayerVisibleRef.current) {
      subwayLayerVisibleRef.current = true
      setSubwayLayerReady(false)
      subwayLayerDelayRef.current = setTimeout(() => {
        subwayLayerDelayRef.current = null
        setSubwayLayerReady(true)
      }, SUBWAY_LAYER_ENTER_DELAY_MS)
    } else {
      setSubwayLayerReady(true)
    }

    if (viewportRecomputeDelayRef.current) clearTimeout(viewportRecomputeDelayRef.current)
    viewportRecomputeDelayRef.current = setTimeout(() => {
      viewportRecomputeDelayRef.current = null
      recomputeRef.current?.()
    }, 80)
  }, [])

  useEffect(() => {
    return () => {
      if (subwayLayerDelayRef.current) clearTimeout(subwayLayerDelayRef.current)
      if (viewportRecomputeDelayRef.current) clearTimeout(viewportRecomputeDelayRef.current)
    }
  }, [])

  // zoom 외 조건(theaters, filters 등) 변경 시 재계산
  useEffect(() => {
    const id = setTimeout(recompute, 80)
    return () => clearTimeout(id)
  }, [recompute])

  // 사용자가 직접 장르·국가 칩을 변경했을 때만 zoom — effect에서 확인
  const userGenreZoomRef = useRef(false)

  // 영화·감독 검색 필터 적용 시 → 매칭 극장이 모두 보이도록 뷰 이동 (검색은 항상 유저 액션)
  // 장르·국가는 handleUserFilterChange에서 userGenreZoomRef를 거쳐야 zoom
  useEffect(() => {
    const isMovieDirectorFilter = !!movieFilter || !!directorFilter
    const isGenreNationFilter = filters.genres.length > 0 || filters.nations.length > 0
    if (!isMovieDirectorFilter && !isGenreNationFilter) return
    if (isGenreNationFilter && !isMovieDirectorFilter) {
      if (!userGenreZoomRef.current) return  // 칩 직접 조작 시에만
      userGenreZoomRef.current = false
    }
    if (suppressMovieFilterFitRef.current && (movieFilter || directorFilter)) return
    if (selectedIdRef.current) return
    const map = mapRef.current
    if (!map) return
    let matchedTheaters = theaters.filter(t => {
      return (theaterPosterMovies.get(t.id) ?? []).some(m => m.matchesFilter)
    })
    if (matchedTheaters.length === 0) return

    if (filters.regionId) {
      const regionTheaters = matchedTheaters.filter(t => getRegionFromCity(t.city) === filters.regionId)
      if (regionTheaters.length > 0) matchedTheaters = regionTheaters
      else {
        const rb = REGION_BOUNDS[filters.regionId]
        if (rb) {
          springFlyToBounds(map, L.latLngBounds([[rb.minLat, rb.minLng], [rb.maxLat, rb.maxLng]]), { padding: [60, 60] })
          return
        }
      }
    }

    if (matchedTheaters.length === 1) {
      const t = matchedTheaters[0]
      springFlyTo(map, [t.lat, t.lng], Math.max(map.getZoom(), 15))
      return
    }
    const bounds = L.latLngBounds(matchedTheaters.map(t => [t.lat, t.lng] as [number, number]))
    springFlyToBounds(map, bounds, { padding: [80, 80], maxZoom: 16 })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directorFilter, movieFilter, filters.genres, filters.nations])

  // 위치 첫 수신 시 지도 이동 — coords 도착 또는 맵 준비 중 늦게 오는 쪽에서 실행
  const initialMoved = useRef(false)
  const coordsRef = useRef(coords)
  coordsRef.current = coords

  const tryLocationFly = useCallback(() => {
    if (initialMoved.current || !mapRef.current || !coordsRef.current) return
    initialMoved.current = true
    springFlyTo(mapRef.current, [coordsRef.current.lat, coordsRef.current.lng], 14)
  }, [])

  useEffect(() => { tryLocationFly() }, [coords, tryLocationFly])

  // 칩 직접 조작 시만 호출되는 zoom 함수 — setFilters와 분리됨
  const theatersRef = useRef(theaters)
  theatersRef.current = theaters
  const filtersRef = useRef(filters)
  filtersRef.current = filters

  const flyToFilter = useCallback((newFilters: FilterState) => {
    const prevFilters = filtersRef.current
    const map = mapRef.current
    if (!map) return

    // 지역 변경 → 즉시 zoom
    if (newFilters.regionId !== prevFilters.regionId && newFilters.regionId) {
      const regionTheaters = theatersRef.current.filter(t => getRegionFromCity(t.city) === newFilters.regionId)
      if (regionTheaters.length > 0) {
        if (regionTheaters.length === 1) {
          springFlyTo(map, [regionTheaters[0].lat, regionTheaters[0].lng], Math.max(map.getZoom(), 14))
        } else {
          const bounds = L.latLngBounds(regionTheaters.map(t => [t.lat, t.lng] as [number, number]))
          springFlyToBounds(map, bounds, { padding: [80, 80], maxZoom: 14 })
        }
      } else {
        const rb = REGION_BOUNDS[newFilters.regionId]
        if (rb) springFlyToBounds(map, L.latLngBounds([[rb.minLat, rb.minLng], [rb.maxLat, rb.maxLng]]), { padding: [60, 60] })
      }
      return
    }

    // 장르·국가 변경 → effect에서 theaterPosterMovies 갱신 후 zoom
    const genreNationChanged =
      newFilters.genres.join() !== prevFilters.genres.join() ||
      newFilters.nations.join() !== prevFilters.nations.join()
    if (genreNationChanged && (newFilters.genres.length > 0 || newFilters.nations.length > 0)) {
      userGenreZoomRef.current = true
    }
  }, [])

  const handleLocate = useCallback(() => {
    collapseCurationOnMapInteraction()
    refetch()
    if (coords && mapRef.current) {
      springFlyTo(mapRef.current, [coords.lat, coords.lng], 15)
    }
  }, [coords, refetch, collapseCurationOnMapInteraction])


  const renderThemeToggle = (style?: CSSProperties) => (
    <button
      onClick={() => void setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
      style={{
        width: 76, height: 40,
        borderRadius: 999,
        padding: 4,
        border: '1px solid var(--color-border)',
        backgroundColor: isDark ? 'var(--color-surface-card)' : 'var(--color-surface-raised)',
        boxShadow: 'var(--shadow-md)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
        overflow: 'hidden',
        position: 'relative',
        ...style,
      }}
    >
      <div style={{
        position: 'absolute',
        width: 32, height: 32,
        borderRadius: '50%',
        backgroundColor: 'var(--color-surface-bg)',
        boxShadow: '0 1px 6px rgba(0,0,0,0.18)',
        left: isDark ? 40 : 4,
        transition: 'left 240ms cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: isDark ? 'var(--color-text-caption)' : 'var(--color-warning)',
        zIndex: 1,
      }}>
        {isDark ? (
          <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
          </svg>
        ) : (
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="5" fill="currentColor" stroke="none"/>
            <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
        )}
      </div>
      <div style={{ width: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-warning)', opacity: isDark ? 0.25 : 0 }}>
        <IcoSun />
      </div>
      <div style={{ width: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-caption)', opacity: isDark ? 0 : 0.35 }}>
        <IcoMoon />
      </div>
    </button>
  )


  // 퇴장 애니메이션 후 완전히 언마운트
  const closeSheet = useCallback(() => {
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current)
    setSheetExiting(true)
    exitTimerRef.current = setTimeout(() => {
      setSelectedId(null)
      setDisplayedId(null)
      setSheetExpanded(false)
      setSheetExiting(false)
      setFromMovieId(null)
      setInitialSheetDate(undefined)
    }, 400)
  }, [])

  // 시트/패널이 열릴 때 남은 영역의 중심으로 flyTo
  const flyToForTheater = useCallback((latlng: [number, number], zoom: number, _duration?: number) => {
    const map = mapRef.current
    if (!map) return
    // desktop: 좌측 도크(64+352=416px)가 가린 영역 피해 오른쪽으로 208px 이동
    // mobile:  하단 시트 300px → 위쪽으로 150px 이동
    const dx = isDesktopLayout ? (GLOBAL_NAV_DESKTOP_WIDTH + DESKTOP_DOCK_WIDTH) / 2 : 0
    const dy = isDesktopLayout ? 0 : -150
    const targetPx = map.project(L.latLng(latlng), zoom)
    const newCenter = map.unproject(L.point(targetPx.x - dx, targetPx.y - dy), zoom)
    springFlyTo(map, [newCenter.lat, newCenter.lng], zoom)
  }, [isDesktopLayout])

  const focusTheater = useCallback((theater: Theater, source: 'search' | 'direct_link' = 'search') => {
    trackEvent('theater sheet opened', {
      theater_id: theater.id,
      theater_name: theater.name,
      source,
      has_movie_filter: Boolean(movieFilter),
      selected_movie_id: movieFilter?.id,
    })
    classifySessionIntent(source === 'direct_link' ? 'type_c' : 'type_c', {
      source,
      theater_id: theater.id,
    })
    setRecentSearches(prev => addToRecent(searchQuery, prev))
    closeSearch()
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current)
    setSheetExiting(false)
    setSelectedId(theater.id)
    setDisplayedId(theater.id)
    setSelectedMovieId(movieFilter?.id ?? '')
    setSheetExpanded(isDesktopLayout)
    const currentZoom = mapRef.current?.getZoom() ?? 15
    flyToForTheater(
      [theater.lat, theater.lng],
      Math.max(currentZoom, 16),
      0.75,
    )
  }, [closeSearch, flyToForTheater, isDesktopLayout, movieFilter, searchQuery])

  const openTheaterForMovie = useCallback((
    theaterId: string,
    movieId: string,
    date?: string,
    source: 'movie_detail' | 'desktop_panel' = 'movie_detail',
  ) => {
    const theater = theaters.find((t) => t.id === theaterId)
    if (!theater) return
    const movie = movies.find((m) => m.id === movieId)

    suppressMovieFilterFitRef.current = true
    closeSearch()
    closeDesktopPanel()
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current)
    setSheetExiting(false)
    setSelectedId(theater.id)
    setDisplayedId(theater.id)
    setSelectedMovieId(movieId)
    setSheetExpanded(isDesktopLayout)
    setFromMovieId(movieId)
    setInitialSheetDate(date || undefined)
    setDirectorFilter(null)
    if (movie) setMovieFilter({ id: movie.id, title: movie.title })

    trackEvent('theater sheet opened', {
      theater_id: theater.id,
      theater_name: theater.name,
      selected_movie_id: movieId,
      source,
      has_movie_filter: true,
    })
    classifySessionIntent('type_a', {
      source,
      theater_id: theater.id,
      selected_movie_id: movieId,
    })

    const currentZoom = mapRef.current?.getZoom() ?? 15
    flyToForTheater(
      [theater.lat, theater.lng],
      Math.max(currentZoom, 16),
      0.75,
    )
  }, [closeDesktopPanel, closeSearch, flyToForTheater, isDesktopLayout, movies, theaters])

  useEffect(() => {
    if (isDesktopLayout && selectedTheater) setSheetExpanded(true)
  }, [isDesktopLayout, selectedTheater])

  // 영화 상세 페이지에서 뒤로가기 시 ?theater= 파라미터로 극장 시트 복원
  const restoredTheaterRef = useRef<string | null>(null)
  useEffect(() => {
    if (theaters.length === 0) return
    const theaterParam = searchParams.get('theater')
    if (!theaterParam) return
    const movieParam = searchParams.get('movie') ?? searchParams.get('fromMovie')
    if (movieParam && movies.length === 0) return
    const dateParam = searchParams.get('date')
    const restoreKey = [theaterParam, movieParam ?? '', dateParam ?? ''].join(':')
    if (restoredTheaterRef.current === restoreKey) return
    const theater = theaters.find((t) => t.id === theaterParam)
    if (!theater) return

    restoredTheaterRef.current = restoreKey
    const fromMovie = searchParams.get('fromMovie')
    if (movieParam) {
      openTheaterForMovie(theater.id, movieParam, dateParam ?? undefined, 'movie_detail')
    } else {
      suppressMovieFilterFitRef.current = true
      closeSearch()
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current)
      setSheetExiting(false)
      setSelectedId(theater.id)
      setDisplayedId(theater.id)
      setSheetExpanded(isDesktopLayout)

      trackEvent('theater sheet opened', {
        theater_id: theater.id,
        theater_name: theater.name,
        source: 'movie_detail',
        has_movie_filter: false,
      })
      classifySessionIntent('type_c', {
        source: 'movie_detail',
        theater_id: theater.id,
      })

      const currentZoom = mapRef.current?.getZoom() ?? 15
      flyToForTheater(
        [theater.lat, theater.lng],
        Math.max(currentZoom, 16),
        0.75,
      )
    }

    if (fromMovie || movieParam) setFromMovieId(fromMovie ?? movieParam ?? null)

    const url = new URL(window.location.href)
    url.searchParams.delete('theater')
    url.searchParams.delete('fromMovie')
    url.searchParams.delete('date')
    url.searchParams.delete('movie')
    window.history.replaceState({}, '', url.toString())

  }, [closeSearch, flyToForTheater, isDesktopLayout, movies.length, openTheaterForMovie, searchParams, theaters])

  // 영화 상세 / 패널에서 ?movie= 파라미터로 지도 필터만 복원
  const restoredMovieFilterRef = useRef<string | null>(null)
  useEffect(() => {
    if (searchParams.has('theater')) return
    const movieParam = searchParams.get('movie')
    if (!movieParam || movies.length === 0) return
    if (restoredMovieFilterRef.current === movieParam) return
    const movie = movies.find((m) => m.id === movieParam)
    if (!movie) return

    restoredMovieFilterRef.current = movieParam
    suppressMovieFilterFitRef.current = false
    clearTheaterSelection()
    setDirectorFilter(null)
    setMovieFilter({ id: movie.id, title: movie.title })

    const url = new URL(window.location.href)
    url.searchParams.delete('movie')
    window.history.replaceState({}, '', url.toString())
  }, [clearTheaterSelection, movies, searchParams])

  // 감독 상세 / 패널에서 ?director= 파라미터로 지도 필터만 복원
  const restoredDirectorFilterRef = useRef<string | null>(null)
  useEffect(() => {
    if (searchParams.has('theater')) return
    const directorParam = searchParams.get('director')
    if (!directorParam) return
    if (restoredDirectorFilterRef.current === directorParam) return
    restoredDirectorFilterRef.current = directorParam
    applyDirectorFilter(directorParam)

    const url = new URL(window.location.href)
    url.searchParams.delete('director')
    window.history.replaceState({}, '', url.toString())
  }, [applyDirectorFilter, searchParams])


  // 극장 선택 시 → 첫 번째 영화 선택 + 시트 collapsed로 열기
  const handlePinClick = useCallback((theaterId: string, clickedMovieId?: string) => {
    if (selectedId === theaterId) {
      trackEvent('theater sheet closed', { theater_id: theaterId, source: 'map' })
      closeSheet()
    } else {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current)
      setSheetExiting(false)
      setSelectedId(theaterId)
      setDisplayedId(theaterId)
      setSelectedMovieId(clickedMovieId ?? movieFilter?.id ?? '')
      setSheetExpanded(isDesktopLayout)
      const currentZoom = mapRef.current?.getZoom() ?? 15
      const theater = theaters.find((t) => t.id === theaterId)
      if (theater) {
        trackEvent('map pin clicked', {
          theater_id: theater.id,
          theater_name: theater.name,
          selected_movie_id: clickedMovieId ?? movieFilter?.id,
          has_movie_filter: Boolean(movieFilter),
          source: 'map',
        })
        trackEvent('theater sheet opened', {
          theater_id: theater.id,
          theater_name: theater.name,
          selected_movie_id: clickedMovieId ?? movieFilter?.id,
          source: 'map',
          has_movie_filter: Boolean(movieFilter),
        })
        classifySessionIntent(movieFilter || clickedMovieId ? 'type_a' : 'type_b', {
          source: 'map',
          theater_id: theater.id,
          selected_movie_id: clickedMovieId ?? movieFilter?.id,
        })
        recordRecentlyViewed(cookieStorageAdapter, 'theater', {
          id: theater.id,
          title: theater.name,
        })
        flyToForTheater(
          [theater.lat, theater.lng],
          Math.max(currentZoom, 16),
          0.5,
        )
      }
    }
  }, [selectedId, closeSheet, flyToForTheater, isDesktopLayout, movieFilter, theaters])

  // FAB 버튼 bottom — 모바일: 떠 있는 시트의 보이는 높이 + 여유 16만큼 띄움
  // 극장 시트 collapsed = COLLAPSED_H(300) + 16 = 316 / 큐레이션 시트 peek = 현재 보이는 높이 + 16
  // 그 외(큐레이션 시트 expanded·극장 시트 expanded·시트 없음) = 하단 탭바(모바일 전용 — GlobalNav) 위 32px 고정
  //   — 큐레이션 시트가 expanded로 올라오면 더 높은 zIndex로 FAB를 그대로 덮어 가림(따라가지 않음)
  const fabBottom = !isDesktopLayout
    ? (selectedTheater && !sheetExpanded && !sheetExiting
        ? 316
        : !selectedTheater && !searchOpen && curationSnap === 'peek' && curationVisibleHeight > 0
          ? curationVisibleHeight + 16
          : GLOBAL_NAV_MOBILE_HEIGHT + 32)
    : 32
  const hasSearchResults = theaterResults.length > 0 || stationResults.length > 0 || movieResults.length > 0 || relatedDirectorResults.length > 0 || areaResults.length > 0

  useEffect(() => {
    const query = searchQuery.trim()
    if (!searchOpen || query.length === 0) return

    const signature = JSON.stringify({
      query,
      theater: theaterResults.length,
      movie: movieResults.length,
      director: relatedDirectorResults.length,
      station: stationResults.length,
      area: areaResults.length,
    })
    const timer = setTimeout(() => {
      if (lastSearchTelemetryRef.current === signature) return
      lastSearchTelemetryRef.current = signature
      const totalResults = theaterResults.length + movieResults.length + relatedDirectorResults.length + stationResults.length + areaResults.length
      trackEvent('search performed', {
        search_term: query,
        search_length: query.length,
        total_results: totalResults,
        theater_results: theaterResults.length,
        movie_results: movieResults.length,
        director_results: relatedDirectorResults.length,
        station_results: stationResults.length,
        area_results: areaResults.length,
      })
      if (totalResults === 0) {
        trackEvent('search no results', {
          search_term: query,
          search_length: query.length,
        })
      }
    }, 700)

    return () => clearTimeout(timer)
  }, [areaResults.length, movieResults.length, relatedDirectorResults.length, searchOpen, searchQuery, stationResults.length, theaterResults.length])

  const renderTheaterSearchSection = () => {
    if (theaterResults.length === 0) return null
    return (
      <section>
        <h2 style={{
          margin: '0 0 10px',
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--color-text-caption)',
        }}>
          극장
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {theaterResults.map((theater) => (
            <button
              key={theater.id}
              type="button"
              onClick={() => {
                trackEvent('search result selected', {
                  result_type: 'theater',
                  result_id: theater.id,
                  result_name: theater.name,
                  search_term: searchQuery.trim(),
                })
                focusTheater(theater, 'search')
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 0',
                border: 0,
                borderBottom: '1px solid var(--color-border)',
                background: 'transparent',
                color: 'var(--color-text-primary)',
                textAlign: 'left',
              }}
            >
              <span style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--color-surface-card)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-sub)',
              }}>
                <svg width={17} height={17} viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 21s7-5.2 7-11a7 7 0 10-14 0c0 5.8 7 11 7 11z" />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
              </span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{
                  display: 'block',
                  fontSize: 15,
                  fontWeight: 700,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {theater.name}
                </span>
                <span style={{
                  display: 'block',
                  marginTop: 4,
                  fontSize: 12,
                  color: 'var(--color-text-caption)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {theater.address}
                </span>
              </span>
              {(() => {
                const distance = calculateAndFormatDistance(
                  coords?.lat,
                  coords?.lng,
                  theater.lat,
                  theater.lng,
                )
                return distance ? (
                  <span style={{
                    flexShrink: 0,
                    fontSize: 13,
                    color: 'var(--color-text-sub)',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                  }}>
                    {distance}
                  </span>
                ) : null
              })()}
              <span style={{ color: 'var(--color-text-caption)', fontSize: 18, lineHeight: 1, flexShrink: 0 }}>›</span>
            </button>
          ))}
        </div>
      </section>
    )
  }

  const renderMovieSearchSection = () => {
    if (movieResults.length === 0) return null
    return (
      <section>
        <h2 style={{
          margin: '0 0 10px',
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--color-text-caption)',
        }}>
          영화
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {movieResults.map((movie) => (
            <div
              key={movie.id}
              onClick={() => {
                trackEvent('search result selected', {
                  result_type: 'movie',
                  result_id: movie.id,
                  result_name: movie.title,
                  search_term: searchQuery.trim(),
                  is_active_movie: activeMovieIdSet.has(movie.id),
                })
                classifySessionIntent('type_a', { source: 'search', movie_id: movie.id })
                setRecentSearches(prev => addToRecent(searchQuery, prev))
                closeSearch()
                if (isDesktopLayout) {
                  openDesktopPanel({ type: 'movie', id: movie.id })
                } else {
                  router.push(`/movie/${movie.id}`)
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 0',
                borderBottom: '1px solid var(--color-border)',
                cursor: 'pointer',
              }}
            >
              <div style={{
                width: 48,
                height: 68,
                borderRadius: 6,
                overflow: 'hidden',
                flexShrink: 0,
                backgroundColor: 'var(--color-surface-card)',
                border: '1px solid var(--color-border)',
              }}>
                {movie.posterUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={movie.posterUrl}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.08) 0 7px, transparent 7px 14px)',
                  }} />
                )}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    minWidth: 0,
                    flex: 1,
                    fontSize: 15,
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {movie.title}
                  </div>
                  {activeMovieIdSet.has(movie.id) && (
                    <span style={{
                      flexShrink: 0,
                      height: 20,
                      padding: '0 7px',
                      borderRadius: 5,
                      display: 'inline-flex',
                      alignItems: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--color-primary-base)',
                      backgroundColor: 'var(--color-primary-subtle-l)',
                      border: '1px solid color-mix(in srgb, var(--color-primary-base) 38%, transparent)',
                    }}>
                      상영중
                    </span>
                  )}
                </div>
                {movie.originalTitle && (
                  <div style={{
                    marginTop: 2,
                    fontFamily: 'var(--font-serif-en)',
                    fontSize: 'var(--text-bask-meta)',
                    fontStyle: 'normal',
                    fontWeight: 400,
                    color: 'var(--color-text-caption)',
                    lineHeight: 1.35,
                  }}>
                    {movie.originalTitle}
                  </div>
                )}
                <div style={{ marginTop: 4, fontSize: 12, color: 'var(--color-text-caption)' }}>
                  {(movie.director.length > 0 ? movie.director.join(', ') : '감독 미입력')} · {movie.year}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  const renderDirectorSearchSection = () => {
    if (relatedDirectorResults.length === 0) return null
    return (
      <section>
        <h2 style={{
          margin: '0 0 10px',
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--color-text-caption)',
        }}>
          감독
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {relatedDirectorResults.map((director) => (
            <div
              key={director.name}
              onClick={() => {
                trackEvent('search result selected', {
                  result_type: 'director',
                  result_id: director.name,
                  result_name: director.name,
                  search_term: searchQuery.trim(),
                })
                setRecentSearches(prev => addToRecent(searchQuery, prev))
                closeSearch()
                if (isDesktopLayout) {
                  openDesktopPanel({ type: 'director', name: director.name })
                } else {
                  router.push(`/director/${encodeURIComponent(director.name)}`)
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 0',
                borderBottom: '1px solid var(--color-border)',
                cursor: 'pointer',
              }}
            >
              <div style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--color-surface-card)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-sub)',
                fontSize: 18,
                fontWeight: 800,
              }}>
                {director.name.slice(0, 1)}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {director.name}
                </div>
                <div style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: 'var(--color-text-caption)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {director.movies.slice(0, 3).map((movie) => movie.title).join(', ')}
                  {director.movies.length > 3 ? ` 외 ${director.movies.length - 3}편` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  const renderStationSearchSection = () => {
    if (stationResults.length === 0) return null
    return (
      <section>
        <h2 style={{
          margin: '0 0 10px',
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--color-text-caption)',
        }}>
          지하철역
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {stationResults.map((station) => (
            <button
              key={station.id}
              type="button"
              onClick={() => focusStation(station)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 0',
                border: 0,
                borderBottom: '1px solid var(--color-border)',
                background: 'transparent',
                color: 'var(--color-text-primary)',
                textAlign: 'left',
              }}
            >
              <span style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--color-surface-card)',
                border: '1px solid var(--color-border)',
              }}>
                <span style={{
                  width: 15,
                  height: 15,
                  borderRadius: '50%',
                  backgroundColor: '#111',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <span style={{
                    width: 13,
                    height: 13,
                    borderRadius: '50%',
                    backgroundColor: '#fff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <span style={{
                      width: 9,
                      height: 9,
                      borderRadius: '50%',
                      backgroundColor: subwayLineColor({ name: station.lines[0] }, isDark),
                    }} />
                  </span>
                </span>
              </span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: 'block', fontSize: 15, fontWeight: 700 }}>
                  {station.name}
                </span>
                <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5 }}>
                  {station.lines.map((line) => (
                    <span
                      key={line}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        height: 18,
                        padding: '0 6px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#fff',
                        backgroundColor: subwayLineColor({ name: line }, isDark),
                      }}
                    >
                      {line}
                    </span>
                  ))}
                </span>
              </span>
              {(() => {
                const distance = calculateAndFormatDistance(
                  coords?.lat,
                  coords?.lng,
                  station.lat,
                  station.lng,
                )
                return distance ? (
                  <span style={{
                    flexShrink: 0,
                    fontSize: 13,
                    color: 'var(--color-text-sub)',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                  }}>
                    {distance}
                  </span>
                ) : null
              })()}
              <span style={{ color: 'var(--color-text-caption)', fontSize: 18, lineHeight: 1, flexShrink: 0 }}>›</span>
            </button>
          ))}
        </div>
      </section>
    )
  }

  const renderAreaSearchSection = () => {
    if (areaResults.length === 0) return null
    return (
      <section>
        <h2 style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: 'var(--color-text-caption)' }}>
          지역
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {areaResults.map(area => (
            <div key={area.name}>
              <button
                type="button"
                onClick={() => focusArea(area)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 0', border: 0,
                  borderBottom: area.theaters.length > 0 ? 'none' : '1px solid var(--color-border)',
                  background: 'transparent', color: 'var(--color-text-primary)', textAlign: 'left',
                }}
              >
                <span style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: 'var(--color-surface-card)', border: '1px solid var(--color-border)',
                  color: 'var(--color-text-sub)',
                }}>
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="8" height="8" rx="1.5" />
                    <rect x="13" y="3" width="8" height="8" rx="1.5" />
                    <rect x="3" y="13" width="8" height="8" rx="1.5" />
                    <rect x="13" y="13" width="8" height="8" rx="1.5" />
                  </svg>
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{area.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-caption)', marginTop: 2 }}>
                    영화관 {area.theaters.length}곳
                  </div>
                </div>
                <span style={{ color: 'var(--color-text-caption)', fontSize: 18, lineHeight: 1 }}>›</span>
              </button>
              {area.theaters.length > 0 && (
                <div style={{
                  marginLeft: 50,
                  paddingBottom: 12,
                  borderBottom: '1px solid var(--color-border)',
                }}>
                  {area.theaters.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        trackEvent('search result selected', {
                          result_type: 'theater',
                          result_id: t.id,
                          result_name: t.name,
                          search_term: searchQuery.trim(),
                          parent_result_type: 'area',
                        })
                        focusTheater(t, 'search')
                      }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                        padding: '6px 0', border: 0, background: 'transparent',
                        color: 'var(--color-text-body)', textAlign: 'left', cursor: 'pointer',
                      }}
                    >
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="none"
                        stroke="var(--color-text-caption)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        style={{ flexShrink: 0 }}>
                        <path d="M12 21s7-5.2 7-11a7 7 0 10-14 0c0 5.8 7 11 7 11z" />
                        <circle cx="12" cy="10" r="2.5" />
                      </svg>
                      <span style={{ fontSize: 13 }}>{t.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100dvh', overflow: 'hidden' }}>
      {/* 영화관 데이터 로딩 인디케이터 */}
      {theatersLoading && (
        <div style={{
          position: 'absolute',
          bottom: 'max(100px, calc(env(safe-area-inset-bottom) + 80px))',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1100,
          background: 'var(--color-surface-sheet)',
          border: '1px solid var(--color-border)',
          borderRadius: 999,
          padding: '6px 16px',
          fontSize: 12,
          color: 'var(--color-text-sub)',
          boxShadow: 'var(--shadow-sheet)',
          pointerEvents: 'none',
        }}>
          영화관 불러오는 중…
        </div>
      )}
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
        minZoom={MAP_MIN_ZOOM}
        maxZoom={MAP_MAX_ZOOM}
        maxBounds={KOREA_MAP_BOUNDS}
        maxBoundsViscosity={1}
        zoomControl={false}
        attributionControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          url={isDark
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
          }
          attribution="&copy; OpenStreetMap contributors &copy; CARTO"
          minZoom={MAP_MIN_ZOOM}
          maxZoom={MAP_MAX_ZOOM}
          bounds={KOREA_MAP_BOUNDS}
          noWrap
        />
        <MapRefSetter mapRef={mapRef} onReady={tryLocationFly} />
        <MapInteractionTracker onInteract={collapseCurationOnMapInteraction} />
        <ViewportTracker onViewport={handleViewport} />
        <OffScreenTracker
          theaterLatLng={selectedTheater ? [selectedTheater.lat, selectedTheater.lng] : null}
          onOffScreen={setTheaterOffScreen}
        />

        {zoom >= SUBWAY_LINE_MIN_ZOOM && subwayLayerReady && SUBWAY_LINES.features.length > 0 && (
          <GeoJSON
            key={`subway-lines-${zoom >= SUBWAY_LINE_MIN_ZOOM ? 'on' : 'off'}-${isDark ? 'dark' : 'light'}`}
            data={SUBWAY_LINES}
            style={(feature) => subwayLineStyle(feature, isDark)}
            interactive={false}
          />
        )}

        {visibleStations.map((station) => (
          <Marker
            key={`station-${station.id}`}
            position={[station.lat, station.lng]}
            icon={makeStationIcon(station, isDark, zoom)}
            interactive={false}
            zIndexOffset={-1000}
          />
        ))}

        {clusters.map((cluster) => {
          // 줌 7-10에서는 항상 클러스터 표시 (1개라도), 줌 11+에서는 2개 이상일 때만 클러스터
          const shouldShowAsCluster = zoom <= 10 || cluster.theaters.length > 1
          if (shouldShowAsCluster) {
            const clusterDimmed = filtersActive && cluster.theaters.every(
              (t) => (theaterPosterMovies.get(t.id) ?? []).every(m => !m.matchesFilter)
            )
            // 지역/도시 클러스터가 아닐 때만 상영 편수 합산
            const clusterMovieCount = (!cluster.regionLabel && !cluster.cityLabel)
              ? cluster.theaters.reduce((sum, t) => sum + (theaterPosterMovies.get(t.id)?.length ?? 0), 0)
              : 0
            return (
              <Marker
                key={`cluster-${cluster.id}`}
                position={[cluster.lat, cluster.lng]}
                opacity={clusterDimmed ? 0.7 : 1}
                zIndexOffset={filtersActive ? -500 : 0}
                icon={makeClusterIcon(
                  cluster.theaters,
                  labelDirections.get(cluster.id),
                  labelOffsets.get(cluster.id),
                  clusterDimmed,
                  isDark,
                  cluster.regionLabel,
                  cluster.cityLabel,
                  clusterMovieCount,
                )}
                eventHandlers={{
                  click: () => {
                    const map = mapRef.current
                    if (!map) return
                    // 동일 건물 클러스터: 바로 분리 줌으로 이동
                    if (cluster.isCoLocation) {
                      springFlyTo(map, [cluster.lat, cluster.lng], CO_LOCATE_SPLIT_ZOOM)
                      return
                    }
                    const currentZoom = map.getZoom()
                    const splitZoom = findSplitZoom(cluster.theaters, map, currentZoom, isDesktopLayout)
                    const bounds = L.latLngBounds(
                      cluster.theaters.map((t) => [t.lat, t.lng] as [number, number])
                    )
                    // 이미 splitZoom 이상이면 중심으로 추가 줌인
                    if (currentZoom >= splitZoom) {
                      springFlyTo(map, [cluster.lat, cluster.lng], currentZoom + 1)
                    } else {
                      springFlyToBounds(map, bounds, { padding: [80, 80], maxZoom: splitZoom })
                    }
                  },
                }}
              />
            )
          }
          // 단일 마커 — 동일 좌표 오프셋 + 포스터 오프셋 적용
          const theater = cluster.theaters[0]
          const coOff = coLocationOffsets.get(theater.id)
          const position: [number, number] = coOff
            ? [coOff.lat, coOff.lng]
            : [theater.lat, theater.lng]
          const offsetX = posterOffsets.get(theater.id) ?? 0
          const posterMovies = theaterPosterMovies.get(theater.id) ?? []
          const dimmed = filtersActive && posterMovies.every(m => !m.matchesFilter)
          return (
            <Marker
              key={theater.id}
              position={position}
              opacity={dimmed ? 0.7 : 1}
              zIndexOffset={
                selectedId === theater.id ? 1000 :
                filtersActive && !dimmed ? 500 :
                filtersActive && dimmed ? -500 :
                0
              }
              icon={makePinIcon(
                theater.name,
                selectedId === theater.id,
                zoom,
                posterMovies,
                filtersActive,
                offsetX,
                labelOffsets.get(theater.id),
                isDark,
                dimmed,
                isDesktopLayout,
              )}
              eventHandlers={{ click: (e) => {
                const target = e.originalEvent?.target as HTMLElement | null
                const movieEl = target?.closest('[data-movie-id]') as HTMLElement | null
                handlePinClick(theater.id, movieEl?.dataset.movieId)
              } }}
            />
          )
        })}
      </MapContainer>

      {/* 검색바 — 모바일 전용 플로팅(데스크톱은 좌측 큐레이션 도크 헤더에 배치) */}
      {!isDesktopLayout && (
        <div style={{
          position: 'absolute',
          top: 'max(0px, env(safe-area-inset-top))',
          left: 0,
          right: 0,
          zIndex: 1001,
          pointerEvents: 'none',
        }}>
          <div style={{ padding: '16px 16px 0', pointerEvents: 'auto' }}>
            <div style={{ boxShadow: 'var(--shadow-sheet)', borderRadius: 'var(--comp-search-radius)' }}>
              <SearchBarButton
                placeholder="영화, 감독, 역, 영화관 검색"
                onClick={openSearch}
              />
            </div>
          </div>
        </div>
      )}

      {/* 필터칩 — 데스크톱: 큐레이션 도크 오른쪽에서 시작 / 모바일: 검색바 아래. maxWidth 없음, 드롭다운이 화면 우측까지 자유롭게 펼쳐짐 */}
      <div style={{
        position: 'absolute',
        top: isDesktopLayout ? 16 : 'max(0px, env(safe-area-inset-top))',
        left: isDesktopLayout ? desktopContentStart : 0,
        right: 0,
        zIndex: 1001,
        pointerEvents: 'none',
        marginTop: isDesktopLayout ? undefined : 16 + 44 + 8, /* mobile: padding(16) + height(44) + gap(8) */
      }}>
        <div style={{ pointerEvents: 'auto' }}>
          <FilterBar
            desktop={isDesktopLayout}
            onChange={setFilters}
            onChipChange={flyToFilter}
            defaultRegionId={coords ? getRegionFromCoords(coords.lat, coords.lng) : null}
            nationOptions={nationOptions}
            movieFilter={movieFilter}
            directorFilter={directorFilter}
            onMovieFilterClear={() => {
              trackEvent('map filter changed', {
                action: 'movie_filter_cleared',
                movie_filter_id: movieFilter?.id,
                movie_filter_title: movieFilter?.title,
              })
              suppressMovieFilterFitRef.current = false
              setMovieFilter(null)
            }}
            onDirectorFilterClear={() => {
              trackEvent('map filter changed', {
                action: 'director_filter_cleared',
                director_filter_name: directorFilter?.name,
              })
              suppressMovieFilterFitRef.current = false
              setDirectorFilter(null)
            }}
            onMovieChipClick={() => {
              setSearchSlideMode(isDesktopLayout && selectedId === null && desktopPanel === null)
              setSearchOpen(true)
            }}
            onDirectorChipClick={() => {
              setSearchSlideMode(isDesktopLayout && selectedId === null && desktopPanel === null)
              setSearchOpen(true)
            }}
          />
        </div>
      </div>

      {/* PC 줌 슬라이더 — 테마 토글 아래 우측 */}
      {/* 지도 하단 로고 워터마크 — 데스크톱은 도크 기본 폭 기준 고정 위치(접힘/시트 전환과 무관하게 흔들리지 않도록).
          모바일은 큐레이션 시트가 peek(최소)일 때 시트 바로 위에 떠 있다가, 시트가 expanded로 올라오면
          시트(zIndex 960~1010)에 가려지는 오버레이 — 그래서 zIndex는 시트보다 낮게 유지 */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: isDesktopLayout ? `calc(50% + ${GLOBAL_NAV_DESKTOP_WIDTH / 2}px)` : '50%',
          bottom: isDesktopLayout
            ? 'max(20px, env(safe-area-inset-bottom))'
            : `${CURATION_PEEK_HEIGHT + 12}px`,
          transform: 'translateX(-50%)',
          zIndex: 550,
          height: 'calc(var(--comp-search-height) * 0.8)',
          width: 109,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: isDark ? 'var(--color-neutral-50)' : 'var(--color-neutral-900)',
            WebkitMaskImage: 'url(/logo.svg)',
            maskImage: 'url(/logo.svg)',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
            filter: isDark
              ? 'drop-shadow(0 4px 14px rgba(0, 0, 0, 0.85)) drop-shadow(0 1px 3px rgba(0, 0, 0, 0.95))'
              : 'drop-shadow(0 4px 14px rgba(0, 0, 0, 0.42)) drop-shadow(0 1px 3px rgba(0, 0, 0, 0.5))',
          }}
        />
      </div>

      {/* 검색 패널 — 모바일: 전체화면 오버레이(iOS 키보드 대응) / 데스크톱: 좌측 레일에 붙는 플랫 도크 패널.
          도크가 비어 있던 채로 열렸으면(searchSlideMode) 도크처럼 좌측에서 슬라이드 인/아웃,
          다른 시트(극장/상세) 위로 열렸으면 애니메이션 없이 바로 겹쳐 표시 */}
      {displayedSearchOpen && (
        <div style={{
          position: 'absolute',
          inset: isDesktopLayout ? `0 auto 0 ${GLOBAL_NAV_DESKTOP_WIDTH}px` : 0,
          width: isDesktopLayout ? DESKTOP_DOCK_WIDTH : 'auto',
          maxWidth: isDesktopLayout ? `calc(100vw - ${GLOBAL_NAV_DESKTOP_WIDTH}px)` : undefined,
          backgroundColor: 'var(--color-surface-bg)',
          display: 'flex',
          flexDirection: 'column',
          // 슬라이드 모드일 땐 도크와 같은 슬롯에서 겹치므로 도크보다 살짝 위, 글로벌 내비 레일보단 아래(레일이 항상 최상단)
          zIndex: searchSlideMode ? 945 : 2000,
          borderRight: isDesktopLayout ? '1px solid var(--color-border)' : undefined,
          overflow: 'hidden',
          transform: searchSlideMode ? (searchIn ? 'translateX(0)' : 'translateX(-100%)') : undefined,
          transition: searchSlideMode ? 'transform 220ms cubic-bezier(0.32, 0.72, 0, 1)' : undefined,
        }}>
          {/* 검색바 헤더 — < 버튼은 SearchBar의 onBack 쉐브론이 담당 */}
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
              placeholder="영화, 감독, 역, 영화관 검색"
              inputFontSize={isDesktopLayout ? 14 : 16}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery('')}
              onBack={closeSearch}
            />
          </div>

          {/* 결과 영역 */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
            {searchQuery === '' ? (
              <div style={{ marginTop: 8 }}>
                {recentSearches.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-caption)', margin: 0 }}>최근 검색</p>
                      <button
                        onClick={() => {
                          setRecentSearches([])
                          try { localStorage.removeItem('movie:recent-searches:v1') } catch {}
                        }}
                        style={{ fontSize: 12, color: 'var(--color-text-caption)', background: 'none', border: 0, cursor: 'pointer', padding: 0 }}
                      >
                        전체 삭제
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {recentSearches.map(q => (
                        <div
                          key={q}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}
                        >
                          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="var(--color-text-caption)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                          </svg>
                          <button
                            onClick={() => setSearchQuery(q)}
                            style={{ flex: 1, background: 'none', border: 0, cursor: 'pointer', textAlign: 'left', padding: 0, fontSize: 14, color: 'var(--color-text-body)' }}
                          >
                            {q}
                          </button>
                          <button
                            onClick={() => setRecentSearches(prev => removeFromRecent(q, prev))}
                            style={{ background: 'none', border: 0, cursor: 'pointer', padding: 4, color: 'var(--color-text-caption)', lineHeight: 1, flexShrink: 0 }}
                          >
                            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                              <path d="M6 6l12 12M18 6 6 18" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p style={{ fontSize: 12, color: 'var(--color-text-caption)', marginBottom: 12, marginLeft: 2 }}>
                  검색할 수 있어요
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    { label: '영화관', example: '서울아트' },
                    { label: '영화', example: '레오파드' },
                    { label: '감독', example: '홍상수' },
                    { label: '지하철역', example: '혜화역' },
                  ].map(({ label, example }) => (
                    <button
                      key={label}
                      onClick={() => setSearchQuery(example)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6, height: 36,
                        padding: '0 14px', borderRadius: 'var(--radius-full)',
                        border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-card)',
                        color: 'var(--color-text-body)', fontSize: 13, fontWeight: 500,
                        cursor: 'pointer', whiteSpace: 'nowrap',
                      }}
                    >
                      {label}
                      <span style={{ fontSize: 11, color: 'var(--color-text-caption)' }}>예) {example}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : hasSearchResults ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                {searchSections.map((section) => {
                  const node = section === 'movies'
                    ? renderMovieSearchSection()
                    : section === 'directors'
                      ? renderDirectorSearchSection()
                      : section === 'theaters'
                        ? renderTheaterSearchSection()
                        : section === 'areas'
                          ? renderAreaSearchSection()
                          : renderStationSearchSection()
                  return node ? <div key={section}>{node}</div> : null
                })}
              </div>
            ) : (
              <p style={{ textAlign: 'center', marginTop: 60, fontSize: 14, color: 'var(--color-text-caption)' }}>
                &ldquo;{searchQuery}&rdquo;와 일치하는 결과가 없습니다
              </p>
            )}
          </div>
        </div>
      )}

      {/* 큐레이션 — 모바일: 항상 떠 있는 드래그 가능한 하단 시트(peek/default/expanded 3단 스냅) */}
      {!isDesktopLayout && !selectedTheater && !searchOpen && (
        <CurationSheet
          snap={curationSnap}
          onSnapChange={handleCurationSnapChange}
          returningFilms={curationData.returningFilms}
          newIndieFilms={curationData.newIndieFilms}
          recentlyViewed={curationData.recentlyViewed}
          onMovieSelect={handleCurationMovieSelect}
        />
      )}

      {/* 큐레이션 도크 — 데스크톱 전용 좌측 상시 패널. 검색 패널·극장 시트와 같은 슬롯·크기를 공유하며 셋 다 비활성일 때만 노출(네이버 지도 레퍼런스) */}
      {isDesktopLayout && !searchOpen && !selectedTheater && (
        <div style={{
          position: 'absolute',
          inset: `0 auto 0 ${GLOBAL_NAV_DESKTOP_WIDTH}px`,
          width: DESKTOP_DOCK_WIDTH,
          maxWidth: `calc(100vw - ${GLOBAL_NAV_DESKTOP_WIDTH}px)`,
          backgroundColor: 'var(--color-surface-card)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 900,
          borderRight: '1px solid var(--color-border)',
          overflow: 'hidden',
          transform: dockCollapsed ? 'translateX(-100%)' : 'translateX(0)',
          transition: 'transform 220ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}>
          <div style={{
            paddingTop: 'max(12px, env(safe-area-inset-top))',
            paddingLeft: 16,
            paddingRight: 16,
            paddingBottom: 12,
            borderBottom: '1px solid var(--color-border)',
            flexShrink: 0,
          }}>
            <SearchBarButton
              placeholder="영화, 감독, 역, 영화관 검색"
              onClick={openSearch}
            />
          </div>
          <div className="themed-scrollbar" style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingTop: 20, paddingBottom: 24 }}>
            <CurationSections
              returningFilms={curationData.returningFilms}
              newIndieFilms={curationData.newIndieFilms}
              recentlyViewed={curationData.recentlyViewed}
              onMovieSelect={handleCurationMovieSelect}
              desktop
            />
          </div>
        </div>
      )}

      {/* 도크 접기/펼치기 토글 — 도크 오른쪽 가장자리에 붙어 폭 변화에 맞춰 같이 이동 (네이버 지도 레퍼런스). 극장 상세가 떠 있을 땐 숨김(항상 펼쳐진 상태로 고정) */}
      {isDesktopLayout && !searchOpen && !selectedTheater && (
        <button
          type="button"
          onClick={() => toggleDockCollapsed()}
          aria-label={dockCollapsed ? '큐레이션 패널 펼치기' : '큐레이션 패널 접기'}
          aria-expanded={!dockCollapsed}
          style={{
            position: 'absolute',
            left: GLOBAL_NAV_DESKTOP_WIDTH + (dockCollapsed ? 0 : DESKTOP_DOCK_WIDTH),
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 901,
            width: 22,
            height: 56,
            borderRadius: '0 12px 12px 0',
            border: '1px solid var(--color-border)',
            borderLeft: 'none',
            backgroundColor: 'var(--color-surface-card)',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--color-text-body)',
            padding: 0,
            minHeight: 'unset',
            transition: 'left 220ms cubic-bezier(0.32, 0.72, 0, 1)',
          }}
        >
          <svg
            width={14} height={14} viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: dockCollapsed ? 'rotate(180deg)' : undefined, transition: 'transform 220ms' }}
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}

      {/* 줌 + 현위치 — 좌측 도크는 지도 위에 겹치지 않으므로(MapView가 그만큼 밀려 시작) 우측 고정 위치 유지 */}
      <div style={{
        position: 'absolute',
        right: 16,
        bottom: fabBottom,
        zIndex: 1000,
        display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center',
        transition: 'bottom 0.38s cubic-bezier(0.32, 0.72, 0, 1)',
      }}>
        {isDesktopLayout ? (
          <ZoomSlider zoom={zoom} mapRef={mapRef} />
        ) : (
          <>
            <FabRound onClick={() => { collapseCurationOnMapInteraction(); mapRef.current?.zoomIn() }}><IcoPlus /></FabRound>
            <FabRound onClick={() => { collapseCurationOnMapInteraction(); mapRef.current?.zoomOut() }}><IcoMinus /></FabRound>
          </>
        )}
        <div style={{ height: isDesktopLayout ? 0 : 8 }} />
        <FabRound onClick={handleLocate}><IcoLocate /></FabRound>
      </div>


      {/* 선택 극장 화면 이탈 시 돌아가기 pill */}
      {selectedId && !sheetExiting && !(sheetExpanded && !isDesktopLayout) && theaterOffScreen && !searchOpen && selectedTheater && (
        <div style={{
          position: 'absolute',
          left: isDesktopLayout ? GLOBAL_NAV_DESKTOP_WIDTH + DESKTOP_DOCK_WIDTH : 0,
          right: isDesktopLayout ? 16 : 0,
          bottom: isDesktopLayout ? 32 : 316,
          zIndex: 1002,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <button
            onClick={() => flyToForTheater([selectedTheater.lat, selectedTheater.lng], Math.max(zoom, 16), 0.6)}
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              height: 40,
              paddingLeft: 6,
              paddingRight: 16,
              borderRadius: 999,
              border: '1px solid rgba(0,0,0,0.14)',
              backgroundColor: 'var(--color-primary-base)',
              boxShadow: 'var(--shadow-md)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              maxWidth: 'calc(100vw - 48px)',
              overflow: 'hidden',
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </div>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              &ldquo;{selectedTheater.name}&rdquo;으로 돌아가기
            </span>
          </button>
        </div>
      )}


      {/* 드래그 바텀시트 — TheaterSheet가 자체적으로 Leaflet 이벤트 차단 */}
      {/* 극장 시트 — 모바일: 풀스크린 드래그 시트 / 데스크톱: 좌측 도크에 내장(영화·감독 상세는 우측에 별도로 플로팅돼 동시 표시 가능) */}
      {selectedTheater && (() => {
        const theaterSheet = (
          <TheaterSheet
            theater={selectedTheater}
            expanded={sheetExpanded}
            exiting={sheetExiting}
            presentation={isDesktopLayout ? 'dock' : 'sheet'}
            selectedMovieId={selectedMovieId}
            onMovieSelect={setSelectedMovieId}
            onExpand={() => {
              trackEvent('theater sheet expanded', {
                theater_id: selectedTheater.id,
                selected_movie_id: selectedMovieId,
              })
              setSheetExpanded(true)
            }}
            onCollapse={() => setSheetExpanded(false)}
            onClose={() => {
              trackEvent('theater sheet closed', {
                theater_id: selectedTheater.id,
                selected_movie_id: selectedMovieId || null,
                source: 'theater_sheet',
              })
              closeSheet()
            }}
            onMovieSearch={(movieId, movieTitle) => {
              trackEvent('theater movie searched on map', {
                theater_id: selectedTheater.id,
                movie_id: movieId,
                movie_title: movieTitle,
              })
              classifySessionIntent('type_a', { source: 'theater_sheet', movie_id: movieId })
              suppressMovieFilterFitRef.current = false
              setDirectorFilter(null)
              setMovieFilter({ id: movieId, title: movieTitle })
            }}
            onMovieDetailOpen={isDesktopLayout ? (id) => {
              trackEvent('search result selected', {
                result_type: 'movie',
                result_id: id,
                theater_id: selectedTheater.id,
                source: 'theater_sheet',
              })
              classifySessionIntent('type_a', { source: 'theater_sheet', movie_id: id })
              openDesktopPanel({ type: 'movie', id })
            } : undefined}
            onDirectorOpen={isDesktopLayout ? (name) => {
              trackEvent('search result selected', {
                result_type: 'director',
                result_id: name,
                result_name: name,
                source: 'theater_sheet',
              })
              openDesktopPanel({ type: 'director', name })
            } : undefined}
            favorited={false}
            onFavorite={() => { /* Phase 4 */ }}
            mapFilters={{ genres: filters.genres, nations: filters.nations }}
            initialIsoDate={initialSheetDate}
            onBack={fromMovieId ? () => router.push(`/movie/${fromMovieId}?tab=theaters`) : undefined}
          />
        )
        if (!isDesktopLayout) return theaterSheet
        return (
          <div style={{
            position: 'absolute',
            inset: `0 auto 0 ${GLOBAL_NAV_DESKTOP_WIDTH}px`,
            width: DESKTOP_DOCK_WIDTH,
            maxWidth: `calc(100vw - ${GLOBAL_NAV_DESKTOP_WIDTH}px)`,
            backgroundColor: 'var(--color-surface-card)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 900,
            borderRight: '1px solid var(--color-border)',
            overflow: 'hidden',
            transform: dockCollapsed ? 'translateX(-100%)' : 'translateX(0)',
            transition: 'transform 220ms cubic-bezier(0.32, 0.72, 0, 1)',
          }}>
            {theaterSheet}
          </div>
        )
      })()}

      {/* PC 영화/감독 상세 패널 — 좌측 도크에 내장(검색·극장 시트와 같은 슬롯을 덮어 표시) */}
      {isDesktopLayout && displayedPanel && (
        <div style={{
          position: 'absolute',
          inset: `0 auto 0 ${GLOBAL_NAV_DESKTOP_WIDTH}px`,
          width: DESKTOP_DOCK_WIDTH,
          maxWidth: `calc(100vw - ${GLOBAL_NAV_DESKTOP_WIDTH}px)`,
          backgroundColor: 'var(--color-surface-card)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 940,
          borderRight: '1px solid var(--color-border)',
          overflow: 'hidden',
          transform: panelIn ? 'translateX(0)' : 'translateX(-100%)',
          transition: panelIn
            ? 'transform 224ms cubic-bezier(0.22, 1, 0.36, 1)'
            : 'transform 196ms cubic-bezier(0.55, 0, 1, 0.45)',
        }}>
          <DesktopDetailPanel
            panel={displayedPanel}
            regionId={filters.regionId}
            embedded
            onClose={closeDesktopPanel}
            onBack={panelStack.length > 1 || selectedTheater ? () => window.history.back() : undefined}
            onNavigate={openDesktopPanel}
            onMovieFilterOnMap={(id, title) => {
              trackEvent('movie theaters map opened', {
                movie_id: id,
                movie_title: title,
                source: 'desktop_panel',
              })
              classifySessionIntent('type_a', { source: 'desktop_panel', movie_id: id })
              suppressMovieFilterFitRef.current = false
              clearTheaterSelection()
              setDirectorFilter(null)
              setMovieFilter({ id, title })
              closeDesktopPanel()
            }}
            onDirectorFilterOnMap={(name) => {
              trackEvent('director theaters map opened', {
                director_name: name,
                source: 'desktop_panel',
              })
              classifySessionIntent('type_a', { source: 'desktop_panel', director_name: name })
              applyDirectorFilter(name)
              closeDesktopPanel()
            }}
            onTheaterOpen={(movieId, theaterId, date) => openTheaterForMovie(theaterId, movieId, date, 'desktop_panel')}
          />
        </div>
      )}

      {/* 설정 패널 — 모바일은 설정 탭으로 흡수, 데스크톱은 좌측 레일의 설정 버튼으로 트리거 */}
      {isDesktopLayout && (
        <SettingsPanel
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          isDesktopLayout={isDesktopLayout}
          isDark={isDark}
          onSetTheme={(theme) => void setTheme(theme)}
          selectedMovieId={selectedMovieId}
          selectedTheaterName={selectedTheater?.name}
        />
      )}

      {/* 큐레이션 영화 시트 — 모바일 전용 (데스크톱은 DesktopDetailPanel이 처리) */}
      {movieSheetId && !isDesktopLayout && (
        <MovieSheet
          movieId={movieSheetId}
          onClose={() => setMovieSheetId(null)}
          onTheaterSelect={(theaterId) => {
            const mid = movieSheetId
            setMovieSheetId(null)
            handlePinClick(theaterId, mid)
          }}
        />
      )}

      {/* 위치 권한 팝업 */}
      {(locPermState === 'prompt' || locPermState === 'requesting' || locPermState === 'denied') && (
        <LocationPermissionModal
          state={locPermState}
          onRequest={locRequest}
          onDismiss={locDismiss}
        />
      )}
    </div>
  )
}
