'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { GeoJSON, MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Map as LeafletMap, Point as LeafletPoint } from 'leaflet'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import { useUserLocation } from '@/hooks/useUserLocation'
import { SearchBarButton, SearchBar, FabRound } from '@/components/primitives'
import { MapPin, PosterThumb, TheaterSheet, FilterBar } from '@/components/domain'
import { useStations, useTheaters } from '@/lib/supabase/queries'
import type { Station, Theater } from '@/types/api'
import subwayLinesData from '@/data/subway-lines.json'

interface SubwayLineProperties {
  line?: string
  lineCode?: string
  name?: string
  color?: string
  stroke?: string
  route?: string
  routeName?: string
  line_name?: string
  lineName?: string
  노선?: string
  노선명?: string
  호선?: string
}

const SUBWAY_LINE_MIN_ZOOM = 15
const STATION_PIN_MIN_ZOOM = 15
const SEOUL_SUBWAY_LINE_COLORS: Record<string, { light: string; dark: string }> = {
  '1': { light: '#0052A4', dark: '#4C8ED1' },
  '1호선': { light: '#0052A4', dark: '#4C8ED1' },
  '2': { light: '#00A84D', dark: '#45D381' },
  '2호선': { light: '#00A84D', dark: '#45D381' },
  '3': { light: '#EF7C1C', dark: '#FFA858' },
  '3호선': { light: '#EF7C1C', dark: '#FFA858' },
  '4': { light: '#00A5DE', dark: '#58C9EB' },
  '4호선': { light: '#00A5DE', dark: '#58C9EB' },
  '5': { light: '#996CAC', dark: '#C6A4D5' },
  '5호선': { light: '#996CAC', dark: '#C6A4D5' },
  '6': { light: '#CD7C2E', dark: '#E0A36B' },
  '6호선': { light: '#CD7C2E', dark: '#E0A36B' },
  '7': { light: '#747F00', dark: '#AAB533' },
  '7호선': { light: '#747F00', dark: '#AAB533' },
  '8': { light: '#E6186C', dark: '#FF66A1' },
  '8호선': { light: '#E6186C', dark: '#FF66A1' },
  '9': { light: '#BB8336', dark: '#D9B27C' },
  '9호선': { light: '#BB8336', dark: '#D9B27C' },
  '수인분당선': { light: '#F5A200', dark: '#FFC966' },
  '분당선': { light: '#F5A200', dark: '#FFC966' },
  '신분당선': { light: '#D4003B', dark: '#FF4D81' },
  '경의중앙선': { light: '#77C4A3', dark: '#A8DECA' },
  '경의중앙': { light: '#77C4A3', dark: '#A8DECA' },
  '경춘선': { light: '#0C8E72', dark: '#52C5AD' },
  '공항철도': { light: '#0090D2', dark: '#59BCEB' },
  'AREX': { light: '#0090D2', dark: '#59BCEB' },
  '서해선': { light: '#81A914', dark: '#B0D150' },
  '경강선': { light: '#003DA5', dark: '#5587E0' },
  '우이신설선': { light: '#B0AD00', dark: '#DEDC5C' },
  '신림선': { light: '#6789CA', dark: '#A2B9E6' },
  '김포골드라인': { light: '#A17800', dark: '#D9B34D' },
  '김포 골드라인': { light: '#A17800', dark: '#D9B34D' },
  '의정부경전철': { light: '#FDA600', dark: '#FFCD66' },
  '의정부선': { light: '#FDA600', dark: '#FFCD66' },
  '에버라인': { light: '#50BB31', dark: '#8DE075' },
  '용인경전철': { light: '#50BB31', dark: '#8DE075' },
  '인천1호선': { light: '#7CA8D5', dark: '#B0CBE8' },
  '인천 1호선': { light: '#7CA8D5', dark: '#B0CBE8' },
  '인천2호선': { light: '#ED8B00', dark: '#FFB64D' },
  '인천 2호선': { light: '#ED8B00', dark: '#FFB64D' },
  'GTX-A': { light: '#9B5AA5', dark: '#C08BC8' },
  'GTXA': { light: '#9B5AA5', dark: '#C08BC8' },
}

const NON_SUBWAY_LINE_PATTERN = /(ktx|srt|itx|새마을|무궁화|누리로|경부선|호남선|전라선|장항선|중앙선|강릉선|태백선|영동선|충북선|경전선|동해선|서해안선)/i
const SUBWAY_LINE_PATTERN = /(호선|신분당|수인분당|분당|경의중앙|경춘|공항철도|arex|우이신설|서해|김포골드|인천|의정부|용인|경전철)/i

function subwayLineLabel(properties: SubwayLineProperties = {}): string {
  return [
    properties.lineCode,
    properties.line,
    properties.name,
    properties.route,
    properties.routeName,
    properties.line_name,
    properties.lineName,
    properties.노선,
    properties.노선명,
    properties.호선,
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
}

function subwayLineColor(properties: SubwayLineProperties = {}, isDark = false): string {
  const label = subwayLineLabel(properties)
  const normalized = label.replace(/\s+/g, '')
  const match = Object.entries(SEOUL_SUBWAY_LINE_COLORS)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([key]) => normalized.includes(key.replace(/\s+/g, '')))
  if (match) return match[1][isDark ? 'dark' : 'light']

  const explicitColor = properties.color ?? properties.stroke
  if (explicitColor && /^#|rgb|hsl|var\(/i.test(explicitColor)) return explicitColor
  return 'var(--color-primary-base)'
}

function isSubwayLineFeature(feature: Feature<Geometry, SubwayLineProperties>): boolean {
  const label = subwayLineLabel(feature.properties)
  if (!label) return false
  if (NON_SUBWAY_LINE_PATTERN.test(label) && !SUBWAY_LINE_PATTERN.test(label)) return false
  const normalized = label.replace(/\s+/g, '')
  const hasKnownSubwayCode = Object.keys(SEOUL_SUBWAY_LINE_COLORS)
    .sort((a, b) => b.length - a.length)
    .some((key) => normalized === key.replace(/\s+/g, ''))
  return hasKnownSubwayCode || SUBWAY_LINE_PATTERN.test(label)
}

const SUBWAY_LINES = {
  ...(subwayLinesData as FeatureCollection<Geometry, SubwayLineProperties>),
  features: (subwayLinesData as FeatureCollection<Geometry, SubwayLineProperties>).features.filter(isSubwayLineFeature),
}

function subwayLineStyle(feature: Feature<Geometry, SubwayLineProperties> | undefined, isDark: boolean) {
  return {
    color: subwayLineColor(feature?.properties, isDark),
    weight: 2,
    opacity: 0.7,
    lineCap: 'round' as const,
    lineJoin: 'round' as const,
  }
}

function stationLineLabel(station: Station): string {
  return station.name
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function makeStationIcon(station: Station, isDark: boolean) {
  const DOT = 15
  const LABEL_H = 16
  const GAP = 4
  const ANCHOR_Y = DOT / 2
  const lineLabel = stationLineLabel(station)
  const color = subwayLineColor({ name: station.lines[0] }, isDark)
  const outerStroke = 1
  const innerStroke = 2
  const coreSize = DOT - (outerStroke + innerStroke) * 2
  const html = `
    <div title="${escapeHtml(station.name)}" style="width:120px;display:flex;flex-direction:column;align-items:center;gap:${GAP}px;overflow:visible;position:relative;">
      <div style="width:${DOT}px;height:${DOT}px;border-radius:50%;background:#111;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,0.2);opacity:0.7;">
        <div style="width:${DOT - outerStroke * 2}px;height:${DOT - outerStroke * 2}px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;">
          <div style="width:${coreSize}px;height:${coreSize}px;border-radius:50%;background:${color};"></div>
        </div>
      </div>
      <div style="-webkit-text-stroke:0.7px rgba(0,0,0,0.88);paint-order:stroke fill;font-size:11px;font-weight:600;white-space:nowrap;color:#fff;line-height:${LABEL_H}px;text-shadow:0 1px 1px rgba(0,0,0,0.45);">
        ${escapeHtml(lineLabel)}
      </div>
    </div>
  `

  return L.divIcon({
    html,
    className: '',
    iconSize: [120, LABEL_H + GAP + DOT],
    iconAnchor: [60, ANCHOR_Y],
  })
}

function normalizeSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/역$/g, '')
}

function stationSearchScore(station: Station, query: string): number {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) return 0

  const names = [station.name, ...station.aliases].map(normalizeSearchText)
  let best = 0
  for (const name of names) {
    if (name === normalizedQuery) best = Math.max(best, 100)
    else if (name.startsWith(normalizedQuery)) best = Math.max(best, 80)
    else if (name.includes(normalizedQuery)) best = Math.max(best, 60)
  }
  return best
}

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
function PosterGrid({ count, total, tailDir, tailOffset = 0 }: {
  count: number
  total: number
  tailDir?: 'up' | 'right'
  tailOffset?: number
}) {
  const overflow = total > count ? total - count : 0
  const perRow = count === 6 ? 3 : count
  const cardWidth = perRow * 44 + Math.max(0, perRow - 1) * 4 + 16
  const tailInset = 14
  const tailX = Math.max(tailInset, Math.min(cardWidth - tailInset, cardWidth / 2 - tailOffset))

  const tailStyle: React.CSSProperties | null = tailDir === 'up' ? {
    position: 'absolute',
    width: 10, height: 10,
    backgroundColor: 'var(--color-surface-card)',
    borderTop: '1.5px solid var(--color-border)',
    borderRight: '1.5px solid var(--color-border)',
    borderTopRightRadius: 2,
    top: -6,
    left: tailX,
    transform: 'translateX(-50%) rotate(45deg)',
    zIndex: 0,
    pointerEvents: 'none',
  } : tailDir === 'right' ? {
    position: 'absolute',
    width: 10, height: 10,
    backgroundColor: 'var(--color-surface-card)',
    borderRight: '1.5px solid var(--color-border)',
    borderBottom: '1.5px solid var(--color-border)',
    borderBottomRightRadius: 2,
    top: '50%',
    right: -6,
    transform: 'translateY(-50%) rotate(45deg)',
    zIndex: 0,
    pointerEvents: 'none',
  } : null

  return (
    <div style={{ position: 'relative', marginTop: 6 }}>
      {tailStyle && <div style={tailStyle} />}
      <div style={{
        backgroundColor: 'var(--color-surface-card)',
        border: '1.5px solid var(--color-border)',
        borderRadius: 8,
        padding: '8px 8px 8px',
        boxShadow: 'var(--shadow-md)',
        display: 'inline-block',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{
          position: 'absolute', top: -7, left: 4,
          fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 3,
          backgroundColor: 'rgba(255,180,0,0.9)', color: '#1A1714',
          letterSpacing: '0.3px', whiteSpace: 'nowrap', zIndex: 1,
        }}>MOCK</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, position: 'relative', zIndex: 1 }}>
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

const TOTAL_MOVIES = 3  // 핀 포스터 그리드 기본 표시 수

type LabelOffset = { x: number; y: number }

function makePinIcon(
  name: string,
  selected: boolean,
  zoom: number,
  posterOffsetX = 0,
  labelOffset: LabelOffset = { x: 0, y: 0 },
) {
  const count = posterCountForZoom(zoom)
  const numRows = count === 6 ? 2 : count > 0 ? 1 : 0
  const usePosterLeft = count > 0 && posterOffsetX < -50
  const posterH = usePosterLeft || numRows === 0 ? 0 : 66 * numRows + 4 * (numRows - 1) + 6

  let posterHtml = ''
  if (count > 0) {
    const posterMarkup = renderToStaticMarkup(
      <PosterGrid
        count={count}
        total={TOTAL_MOVIES}
        tailDir={usePosterLeft ? 'right' : 'up'}
        tailOffset={usePosterLeft ? 0 : posterOffsetX}
      />
    )
    if (usePosterLeft) {
      posterHtml =
        `<div style="position:absolute;` +
        `right:calc(50% + ${DOT / 2 + 4}px);` +
        `top:${ANCHOR_Y}px;` +
        `transform:translateY(-50%);">` +
        posterMarkup +
        `</div>`
    } else {
      posterHtml = `<div style="position:relative;left:${Math.round(posterOffsetX)}px">` +
        posterMarkup +
        `</div>`
    }
  }

  const html = `
    <div style="width:140px;display:flex;flex-direction:column;align-items:center;overflow:visible;position:relative;">
      ${renderToStaticMarkup(<MapPin kind="indie" selected={selected} label={name} labelOffset={labelOffset} />)}
      ${posterHtml}
    </div>
  `

  return L.divIcon({
    html,
    className: '',
    iconSize: [140, LABEL_H + GAP + DOT + posterH],
    iconAnchor: [70, ANCHOR_Y],
  })
}

/* ── 클러스터 타입 ─────────────────────────────────────────────── */
interface TheaterCluster {
  id: string
  theaters: Theater[]
  lat: number
  lng: number
  isCoLocation?: boolean  // 동일 건물 — 클릭 시 CO_LOCATE_SPLIT_ZOOM으로 이동
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
    for (const dir of ['top', 'bottom', 'right', 'left'] as LabelDir[]) {
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
  return Math.min(180, Math.max(42, label.length * 12 + 14))
}

function computeNameLabelOffsets(
  clusters: TheaterCluster[],
  map: LeafletMap,
  labelDirections: Map<string, LabelDir>,
): Map<string, LabelOffset> {
  type Rect = [number, number, number, number]
  type LabelItem = { id: string; priority: number; rect: Rect }
  const margin = 4
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

/* ── 줌 레벨에서 클러스터링 반경(px) ── */
function clusterRadiusForZoom(zoom: number): number {
  if (zoom >= 16) return 30
  if (zoom >= 15) return 45
  if (zoom >= 14) return 60
  return 80
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
      const angle = (2 * Math.PI * idx) / group.length
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
): TheaterCluster[] {
  const radiusPx = clusterRadiusForZoom(zoom)

  // 분리 대상이 아닌 극장만 클러스터링
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

    // 클러스터 전체가 동일 건물인지 — 클릭 시 CO_LOCATE_SPLIT_ZOOM으로 이동
    const firstKey = coLocGroupKey.get(group[0].t.id)
    const isCoLocation = group.length > 1 &&
      !!firstKey &&
      group.every((g) => coLocGroupKey.get(g.t.id) === firstKey)

    clusters.push({ id: a.t.id, theaters: group.map((g) => g.t), lat, lng, isCoLocation })
  }

  // 분리 대상은 개별 마커로 추가 (coLocationOffsets 적용 좌표 사용)
  for (const t of theaters.filter((t) => splitIds.has(t.id))) {
    clusters.push({ id: t.id, theaters: [t], lat: t.lat, lng: t.lng })
  }

  return clusters
}

/* ── 포스터 겹침 방지 오프셋 계산 ─────────────────────────────── */
// 단일 마커끼리, 또는 단일 포스터와 클러스터 표시 영역이 가로/세로 모두 1/4 이상 겹칠 때만 수평으로 밀어냄
function computePosterOffsets(
  clusters: TheaterCluster[],
  map: LeafletMap,
  zoom: number,
  labelDirections: Map<string, LabelDir> = new Map(),
): Map<string, number> {
  const offsets = new Map<string, number>()
  if (posterCountForZoom(zoom) === 0) return offsets

  type Rect = [number, number, number, number]
  const overlap = (a: Rect, b: Rect) => ({
    x: Math.min(a[2], b[2]) - Math.max(a[0], b[0]),
    y: Math.min(a[3], b[3]) - Math.max(a[1], b[1]),
  })

  const POSTER_W = 140
  const count = posterCountForZoom(zoom)
  const rowCount = count === 6 ? 2 : 1
  const POSTER_H = 66 * rowCount + 4 * Math.max(0, rowCount - 1) + 16 + 6
  const POSTER_TOP_FROM_PIN = DOT / 2 + 6
  const MIN_OVERLAP_X_TO_SHIFT = POSTER_W / 4
  const MIN_OVERLAP_Y_TO_SHIFT = POSTER_H / 4
  const singles = clusters
    .filter((c) => c.theaters.length === 1)
    .map((c) => ({
      id: c.id,
      px: map.latLngToContainerPoint([c.lat, c.lng] as [number, number]),
    }))
  const posterRect = (single: { id: string; px: LeafletPoint }, offset = offsets.get(single.id) ?? 0): Rect => [
    single.px.x - POSTER_W / 2 + offset,
    single.px.y + POSTER_TOP_FROM_PIN,
    single.px.x + POSTER_W / 2 + offset,
    single.px.y + POSTER_TOP_FROM_PIN + POSTER_H,
  ]

  for (let i = 0; i < singles.length; i++) {
    for (let j = i + 1; j < singles.length; j++) {
      const a = singles[i]
      const b = singles[j]
      const o = overlap(posterRect(a), posterRect(b))
      if (o.x < MIN_OVERLAP_X_TO_SHIFT || o.y < MIN_OVERLAP_Y_TO_SHIFT) continue
      const shift = o.x / 2 + 8
      const dx = b.px.x - a.px.x
      offsets.set(a.id, (offsets.get(a.id) ?? 0) + (dx >= 0 ? -shift : shift))
      offsets.set(b.id, (offsets.get(b.id) ?? 0) + (dx >= 0 ? shift : -shift))
    }
  }

  const clusterBlockers: { centerX: number; rect: Rect }[] = []
  for (const c of clusters) {
    if (c.theaters.length <= 1) continue
    const { x: cx, y: cy } = map.latLngToContainerPoint([c.lat, c.lng] as [number, number])

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
    for (const blocker of clusterBlockers) {
      const rect = posterRect(single)
      const o = overlap(rect, blocker.rect)
      if (o.x < MIN_OVERLAP_X_TO_SHIFT || o.y < MIN_OVERLAP_Y_TO_SHIFT) continue
      const direction = (single.px.x + (offsets.get(single.id) ?? 0)) < blocker.centerX ? -1 : 1
      offsets.set(single.id, (offsets.get(single.id) ?? 0) + direction * (o.x - MIN_OVERLAP_X_TO_SHIFT + 8))
    }
  }

  return offsets
}

/* ── 클러스터 아이콘 ────────────────────────────────────────────── */
function makeClusterIcon(
  theaters: Theater[],
  labelDir: LabelDir = 'top',
  labelOffset: LabelOffset = { x: 0, y: 0 },
) {
  const count = theaters.length
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
      `<div style="font-size:11px;font-weight:600;line-height:${LINE_H}px;` +
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
    const html =
      `<div style="position:relative;width:${CANVAS_W}px;height:${CANVAS_H}px;overflow:visible;">` +
      `<div style="${wrapperStyle}">` +
      `<div style="${tailBase}${tailStyles[labelDir]}"></div>` +
      `<div style="${cardStyle}">${names}</div>` +
      `</div>` +
      `<div style="position:absolute;width:${DOT_D}px;height:${DOT_D}px;` +
      `top:${CENTER_Y - DOT_R}px;left:${CENTER_X - DOT_R}px;` +
      `border-radius:50%;background:var(--color-primary-base);` +
      `border:2px solid var(--color-surface-bg);box-shadow:var(--shadow-sm);` +
      `display:flex;align-items:center;justify-content:center;` +
      `color:#fff;font-weight:700;font-size:12px;z-index:1;">${count}</div>` +
      `</div>`

    return L.divIcon({
      html,
      className: '',
      iconSize: [CANVAS_W, CANVAS_H],
      iconAnchor: [CENTER_X, CENTER_Y],
    })
  }

  const SIZE = 40
  const html =
    `<div style="width:${SIZE}px;height:${SIZE}px;border-radius:50%;` +
    `background:var(--color-primary-base);` +
    `display:flex;align-items:center;justify-content:center;` +
    `color:#fff;font-weight:700;font-size:16px;line-height:1;` +
    `box-shadow:var(--shadow-md);` +
    `border:2.5px solid var(--color-surface-bg);">${count}</div>`
  return L.divIcon({ html, className: '', iconSize: [SIZE, SIZE], iconAnchor: [SIZE / 2, SIZE / 2] })
}

/* ── 클러스터가 분리되는 최소 줌 계산 ── */
function findSplitZoom(
  theaters: Theater[],
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
function useIsDark() {
  const [isDark, setIsDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark'
  )
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setIsDark(document.documentElement.getAttribute('data-theme') === 'dark')
    })
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])
  return isDark
}

export default function MapView() {
  const { coords, refetch } = useUserLocation()
  const isDark = useIsDark()
  const { data: theaters = [], isLoading: theatersLoading } = useTheaters()
  const { data: stations = [] } = useStations()
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

  const stationResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    return stations
      .map((station) => ({ station, score: stationSearchScore(station, searchQuery) }))
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score || a.station.name.localeCompare(b.station.name, 'ko'))
      .slice(0, 20)
      .map((result) => result.station)
  }, [searchQuery, stations])

  const focusStation = useCallback((station: Station) => {
    closeSearch()
    setSelectedId(null)
    setDisplayedId(null)
    setSheetExpanded(false)
    mapRef.current?.flyTo([station.lat, station.lng], 16, { duration: 0.75 })
  }, [closeSearch])

  // 바텀시트 상태
  const [sheetExpanded, setSheetExpanded] = useState(false)
  const [selectedMovieId, setSelectedMovieId] = useState('')
  const [sheetExiting, setSheetExiting] = useState(false)
  // displayedId: 퇴장 애니메이션 중에도 이전 극장을 유지하기 위한 지연 참조
  const [displayedId, setDisplayedId] = useState<string | null>(null)
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const defaultCenter: [number, number] = [37.5665, 126.978]
  const selectedTheater = theaters.find((t) => t.id === (displayedId ?? selectedId)) ?? null

  /* ── 클러스터 & 오프셋 ── */
  const [clusters, setClusters] = useState<TheaterCluster[]>([])
  const [posterOffsets, setPosterOffsets] = useState<Map<string, number>>(new Map())
  // 동일 좌표 극장의 픽셀 고정 오프셋 (줌 변경 시마다 재계산)
  const [coLocationOffsets, setCoLocationOffsets] = useState<Map<string, { lat: number; lng: number }>>(new Map())
  const [labelDirections, setLabelDirections] = useState<Map<string, LabelDir>>(new Map())
  const [labelOffsets, setLabelOffsets] = useState<Map<string, LabelOffset>>(new Map())

  const recompute = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    const coLocGroups = findCoLocationGroups(theaters)
    const coLoc = computeCoLocationOffsets(theaters, map, zoom)
    const splitIds = new Set(coLoc.keys())
    // 분리 대상은 오프셋 적용 좌표로 교체 후 클러스터 계산
    const adjustedTheaters = theaters.map((t) => {
      const off = coLoc.get(t.id)
      return off ? { ...t, lat: off.lat, lng: off.lng } : t
    })
    const c = computeClusters(adjustedTheaters, map, zoom, splitIds, coLocGroups)
    const d = computeLabelDirections(c, map)
    const labelO = computeNameLabelOffsets(c, map, d)
    const o = computePosterOffsets(c, map, zoom, d)
    setClusters(c)
    setPosterOffsets(o)
    setCoLocationOffsets(coLoc)
    setLabelDirections(d)
    setLabelOffsets(labelO)
  }, [zoom, theaters])

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
      setSelectedMovieId('')
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
  }, [selectedId, closeSheet])

  // FAB 버튼 bottom: collapsed = COLLAPSED_H(300) + 여유 16 = 316
  // expanded / 시트 없음 = safe area 위 32px
  const fabBottom = selectedTheater && !sheetExpanded ? 316 : 32

  return (
    <div style={{ position: 'relative', width: '100%', height: '100dvh' }}>
      {/* 영화관 데이터 로딩 인디케이터 */}
      {theatersLoading && (
        <div style={{
          position: 'absolute',
          top: 'max(72px, calc(env(safe-area-inset-top) + 56px))',
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
        zoomControl={false}
        attributionControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          url={isDark
            ? 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
          }
          attribution={isDark
            ? '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; OpenStreetMap contributors'
            : '&copy; OpenStreetMap contributors &copy; CARTO'
          }
          maxZoom={19}
        />
        <MapRefSetter mapRef={mapRef} />
        <ZoomTracker onZoom={setZoom} />

        {zoom >= SUBWAY_LINE_MIN_ZOOM && SUBWAY_LINES.features.length > 0 && (
          <GeoJSON
            key={`subway-lines-${zoom >= SUBWAY_LINE_MIN_ZOOM ? 'on' : 'off'}-${isDark ? 'dark' : 'light'}`}
            data={SUBWAY_LINES}
            style={(feature) => subwayLineStyle(feature, isDark)}
            interactive={false}
          />
        )}

        {zoom >= STATION_PIN_MIN_ZOOM && stations.map((station) => (
          <Marker
            key={`station-${station.id}`}
            position={[station.lat, station.lng]}
            icon={makeStationIcon(station, isDark)}
            interactive={false}
            zIndexOffset={-1000}
          />
        ))}

        {clusters.map((cluster) => {
          // 클러스터 마커 (2개 이상) — 클릭 시 줌인
          if (cluster.theaters.length > 1) {
            return (
              <Marker
                key={`cluster-${cluster.id}`}
                position={[cluster.lat, cluster.lng]}
                icon={makeClusterIcon(
                  cluster.theaters,
                  labelDirections.get(cluster.id),
                  labelOffsets.get(cluster.id),
                )}
                eventHandlers={{
                  click: () => {
                    const map = mapRef.current
                    if (!map) return
                    // 동일 건물 클러스터: 바로 분리 줌으로 이동
                    if (cluster.isCoLocation) {
                      map.flyTo([cluster.lat, cluster.lng], CO_LOCATE_SPLIT_ZOOM, { duration: 0.6 })
                      return
                    }
                    const currentZoom = map.getZoom()
                    const splitZoom = findSplitZoom(cluster.theaters, map, currentZoom)
                    const bounds = L.latLngBounds(
                      cluster.theaters.map((t) => [t.lat, t.lng] as [number, number])
                    )
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
          // 단일 마커 — 동일 좌표 오프셋 + 포스터 오프셋 적용
          const theater = cluster.theaters[0]
          const coOff = coLocationOffsets.get(theater.id)
          const position: [number, number] = coOff
            ? [coOff.lat, coOff.lng]
            : [theater.lat, theater.lng]
          const offsetX = posterOffsets.get(theater.id) ?? 0
          return (
            <Marker
              key={theater.id}
              position={position}
              icon={makePinIcon(
                theater.name,
                selectedId === theater.id,
                zoom,
                offsetX,
                labelOffsets.get(theater.id),
              )}
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
        zIndex: 1001,
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

          {/* 결과 영역 */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
            {searchQuery === '' ? (
              <p style={{ textAlign: 'center', marginTop: 60, fontSize: 14, color: 'var(--color-text-caption)' }}>
                극장명, 영화 제목, 감독 이름으로 검색하세요
              </p>
            ) : stationResults.length > 0 ? (
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
                      <span style={{ color: 'var(--color-text-caption)', fontSize: 18, lineHeight: 1 }}>›</span>
                    </button>
                  ))}
                </div>
              </section>
            ) : (
              <p style={{ textAlign: 'center', marginTop: 60, fontSize: 14, color: 'var(--color-text-caption)' }}>
                &ldquo;{searchQuery}&rdquo;와 일치하는 지하철역이 없습니다
              </p>
            )}
          </div>
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
