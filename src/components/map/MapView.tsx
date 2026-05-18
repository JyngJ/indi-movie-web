'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { GeoJSON, MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Map as LeafletMap, Point as LeafletPoint } from 'leaflet'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import { useUserLocation } from '@/hooks/useUserLocation'
import { SearchBarButton, SearchBar, FabRound } from '@/components/primitives'
import { MapPin, PosterThumb, TheaterSheet, FilterBar } from '@/components/domain'
import { DesktopDetailPanel } from '@/components/domain/DesktopDetailPanel'
import type { DesktopPanelState } from '@/components/domain/DesktopDetailPanel'
import type { FilterState } from '@/components/domain'
import { useActiveMovieIds, useMapShowtimes, useMovies, useStations, useTheaters } from '@/lib/supabase/queries'
import type { Movie, Station, Theater } from '@/types/api'
import subwayLinesData from '@/data/subway-lines.json'
import { SEOUL_GU, SEOUL_DONG } from '@/data/seoul-areas'
import { normalizeGenre } from '@/lib/genres'
import { useThemeStore } from '@/store/themeStore'

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
const STATION_PIN_FULL_ZOOM = 17
const SEARCH_CROSS_RESULT_LIMIT = 5
const DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
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

function startOfLocalDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

function formatDateParam(date: Date) {
  return DATE_FORMATTER.format(date)
}

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
    default: {
      const dow = today.getDay()
      const weekEnd = dow === 0 ? addDays(today, 6) : addDays(today, 7 - dow)
      return { start: today, end: weekEnd }
    }
  }
}

function makeStationIcon(station: Station, isDark: boolean, zoom: number) {
  const compact = zoom < STATION_PIN_FULL_ZOOM
  const DOT = compact ? 11 : 15
  const LABEL_H = compact ? 12 : 16
  const GAP = compact ? 2 : 4
  const FONT_SIZE = compact ? 9 : 11
  const FONT_WEIGHT = compact ? 600 : 600
  const ANCHOR_Y = DOT / 2
  const lineLabel = stationLineLabel(station)
  const color = subwayLineColor({ name: station.lines[0] }, isDark)
  const outerStroke = compact ? 0.75 : 1
  const innerStroke = compact ? 1.5 : 2
  const coreSize = Math.max(3, DOT - (outerStroke + innerStroke) * 2)
  const html = `
    <div title="${escapeHtml(station.name)}" style="width:120px;display:flex;flex-direction:column;align-items:center;gap:${GAP}px;overflow:visible;position:relative;">
      <div style="width:${DOT}px;height:${DOT}px;border-radius:50%;background:#111;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,0.2);opacity:0.7;">
        <div style="width:${DOT - outerStroke * 2}px;height:${DOT - outerStroke * 2}px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;">
          <div style="width:${coreSize}px;height:${coreSize}px;border-radius:50%;background:${color};"></div>
        </div>
      </div>
      <div style="-webkit-text-stroke:${compact ? 0.55 : 0.7}px rgba(0,0,0,0.88);paint-order:stroke fill;font-size:${FONT_SIZE}px;font-weight:${FONT_WEIGHT};white-space:nowrap;color:#fff;line-height:${LABEL_H}px;text-shadow:0 1px 1px rgba(0,0,0,0.45);">
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

// 한국어 모음 혼동 정규화: ㅐ→ㅔ, ㅒ→ㅖ (발음 동일 처리)
// Hangul 음절 = 0xAC00 + (초성*21 + 중성)*28 + 종성
function normalizeKoreanVowels(str: string): string {
  let result = ''
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    if (code < 0xAC00 || code > 0xD7A3) { result += str[i]; continue }
    const offset = code - 0xAC00
    const jong = offset % 28
    const jung = Math.floor(offset / 28) % 21
    const cho = Math.floor(offset / 588)
    // ㅐ(1)→ㅔ(5), ㅒ(3)→ㅖ(7)
    const normJung = jung === 1 ? 5 : jung === 3 ? 7 : jung
    result += String.fromCharCode(0xAC00 + cho * 588 + normJung * 28 + jong)
  }
  return result
}

function normalizeSearchText(value: string): string {
  return normalizeKoreanVowels(
    value.trim().toLowerCase().replace(/\s+/g, '').replace(/역$/g, '')
  )
}

// 서브시퀀스 퍼지 매칭: 쿼리 글자들이 타겟 안에 순서대로 등장하면 점수 반환 (10-35)
function fuzzyScore(target: string, query: string): number {
  let qi = 0
  for (let ti = 0; ti < target.length && qi < query.length; ti++) {
    if (target[ti] === query[qi]) qi++
  }
  return qi === query.length ? Math.max(10, Math.floor(35 * query.length / target.length)) : 0
}

/* ── localStorage 최근 검색 ─────────────────────────────────────── */
const RECENT_KEY = 'movie:recent-searches:v1'
function loadRecentSearches(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') } catch { return [] }
}
function addToRecent(query: string, list: string[]): string[] {
  const q = query.trim()
  if (!q) return list
  const next = [q, ...list.filter(x => x !== q)].slice(0, 8)
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)) } catch {}
  return next
}
function removeFromRecent(query: string, list: string[]): string[] {
  const next = list.filter(x => x !== query)
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)) } catch {}
  return next
}

function finiteNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback
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
    else best = Math.max(best, fuzzyScore(name, normalizedQuery))
  }
  return best
}

function movieSearchScore(movie: Movie, query: string): number {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) return 0

  const titles = [movie.title, movie.originalTitle ?? ''].map(normalizeSearchText).filter(Boolean)
  let best = 0
  for (const title of titles) {
    if (title === normalizedQuery) best = Math.max(best, 100)
    else if (title.startsWith(normalizedQuery)) best = Math.max(best, 80)
    else if (title.includes(normalizedQuery)) best = Math.max(best, 60)
    else best = Math.max(best, fuzzyScore(title, normalizedQuery))
  }
  return best
}

function directorSearchScore(director: string, query: string): number {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) return 0

  const normalizedDirector = normalizeSearchText(director)
  if (!normalizedDirector) return 0
  if (normalizedDirector === normalizedQuery) return 100
  if (normalizedDirector.startsWith(normalizedQuery)) return 80
  if (normalizedDirector.includes(normalizedQuery)) return 60
  return fuzzyScore(normalizedDirector, normalizedQuery)
}

function theaterSearchScore(theater: Theater, query: string): number {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) return 0

  const fields = [theater.name, theater.address, theater.city ?? '']
    .map(normalizeSearchText)
    .filter(Boolean)
  let best = 0
  for (const field of fields) {
    if (field === normalizedQuery) best = Math.max(best, 100)
    else if (field.startsWith(normalizedQuery)) best = Math.max(best, 82)
    else if (field.includes(normalizedQuery)) best = Math.max(best, 58)
    else best = Math.max(best, fuzzyScore(field, normalizedQuery))
  }
  return best
}

function areaSearchScore(name: string, query: string): number {
  const nq = normalizeSearchText(query)
  const na = normalizeSearchText(name)
  if (!nq || !na) return 0
  if (na === nq) return 100
  if (na.startsWith(nq)) return 78
  if (na.includes(nq)) return 55
  return fuzzyScore(na, nq)
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
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
    <circle cx={12} cy={12} r={6.5} />
    <circle cx={12} cy={12} r={1.7} fill="currentColor" stroke="none" />
    <path d="M12 2.8v4M12 17.2v4M2.8 12h4M17.2 12h4" />
  </svg>
)
const IcoSun = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
    <circle cx={12} cy={12} r={4} />
    <path d="M12 2.8v2.4M12 18.8v2.4M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7" />
  </svg>
)
const IcoMoon = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.2 14.4A7.6 7.6 0 0 1 9.6 3.8 8.7 8.7 0 1 0 20.2 14.4z" />
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

// 데스크톱 zoom 17+ 에서 단계별 포스터 확대
function posterSizeForZoom(zoom: number, isDesktop: boolean): { w: number; h: number } {
  if (!isDesktop) {
    if (zoom >= 19) return { w: 58, h: 87 }
    if (zoom >= 18) return { w: 52, h: 78 }
    if (zoom >= 17) return { w: 48, h: 72 }
    return { w: 44, h: 66 }
  }
  if (zoom >= 19) return { w: 96, h: 144 }
  if (zoom >= 18) return { w: 80, h: 120 }
  if (zoom >= 17) return { w: 66, h: 99 }
  return { w: 52, h: 78 }
}

/* ── 포스터 그리드 ──────────────────────────────────────────────── */
interface TheaterPosterMovie {
  id: string
  title: string
  posterUrl?: string
  genre: string[]
  nation?: string
  director?: string[]
  showtimeCount: number
  hasAvailableSeats: boolean
  matchesFilter: boolean
}

interface PosterSlot {
  movie?: TheaterPosterMovie
  overflow?: number | string
  countLabel?: string
  dimmed?: boolean
}

function posterSlotsForZoom(movies: TheaterPosterMovie[], zoom: number, filtersActive = false, forceMinOne = false): PosterSlot[] {
  const rawCapacity = posterCountForZoom(zoom)
  const capacity = forceMinOne && rawCapacity === 0 ? 1 : rawCapacity
  if (capacity === 0 || movies.length === 0) return []

  // 매칭 영화 먼저, 미매칭 나중
  const sorted = filtersActive
    ? [...movies].sort((a, b) => Number(b.matchesFilter) - Number(a.matchesFilter))
    : movies

  const dim = (m: TheaterPosterMovie) => filtersActive && !m.matchesFilter

  if (capacity === 1) {
    return sorted.length === 1
      ? [{ movie: sorted[0], dimmed: dim(sorted[0]) }]
      : [{ movie: sorted[0], overflow: `${sorted.length}편`, dimmed: dim(sorted[0]) }]
  }
  if (sorted.length <= capacity) return sorted.map((m) => ({ movie: m, dimmed: dim(m) }))

  const visiblePosterCount = capacity - 1
  return [
    ...sorted.slice(0, visiblePosterCount).map((m) => ({ movie: m, dimmed: dim(m) })),
    { movie: sorted[visiblePosterCount], overflow: sorted.length - visiblePosterCount, dimmed: dim(sorted[visiblePosterCount]) },
  ]
}

function MovieListCard({ movies }: { movies: TheaterPosterMovie[] }) {
  return (
    <div className="po-list">
      <div className="po-list-tail" />
      {movies.slice(0, 10).map((m) => (
        <div key={m.id} className="po-list-item">
          <span className="po-list-title">{m.title}</span>
          {m.director?.[0] && <span className="po-list-director"> — {m.director[0]}</span>}
        </div>
      ))}
      {movies.length > 10 && (
        <div className="po-list-more">+{movies.length - 10}편 더</div>
      )}
    </div>
  )
}

function PosterGrid({ slots, tailDir, tailOffset = 0, matchCount, filtersActive = false, selected = false, posterW = 44, posterH = 66, allMovies }: {
  slots: PosterSlot[]
  tailDir?: 'up' | 'right'
  tailOffset?: number
  matchCount?: number
  filtersActive?: boolean
  selected?: boolean
  posterW?: number
  posterH?: number
  allMovies?: TheaterPosterMovie[]
}) {
  const count = slots.length
  const perRow = count > 3 ? 3 : count
  const cardWidth = perRow * posterW + Math.max(0, perRow - 1) * 4 + 16
  const tailInset = 14
  const safeTailOffset = finiteNumber(tailOffset)
  const tailX = Math.max(tailInset, Math.min(cardWidth - tailInset, cardWidth / 2 - safeTailOffset))

  const tailBg = selected ? 'var(--color-primary-base)' : 'var(--color-surface-card)'
  const tailBorder = selected ? '1.5px solid rgba(0,0,0,0.14)' : '1.5px solid var(--color-border)'

  const tailStyle: React.CSSProperties | null = tailDir === 'up' ? {
    position: 'absolute',
    width: 10, height: 10,
    backgroundColor: tailBg,
    borderTop: tailBorder,
    borderRight: tailBorder,
    borderTopRightRadius: 2,
    top: -6,
    left: tailX,
    transform: 'translateX(-50%) rotate(45deg)',
    zIndex: 0,
    pointerEvents: 'none',
  } : tailDir === 'right' ? {
    position: 'absolute',
    width: 10, height: 10,
    backgroundColor: tailBg,
    borderRight: tailBorder,
    borderBottom: tailBorder,
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
        backgroundColor: selected ? 'var(--color-primary-base)' : 'var(--color-surface-card)',
        border: selected ? '1.5px solid rgba(0,0,0,0.14)' : '1.5px solid var(--color-border)',
        borderRadius: 8,
        padding: '8px 8px 8px',
        boxShadow: selected ? 'var(--shadow-lg)' : 'var(--shadow-md)',
        display: 'inline-block',
        position: 'relative',
        zIndex: 1,
      }}>
        {filtersActive && matchCount != null && matchCount > 0 && (
          <div style={{
            position: 'absolute',
            top: -8,
            right: -8,
            backgroundColor: 'var(--color-primary-base)',
            color: '#fff',
            borderRadius: 999,
            padding: '2px 7px',
            fontSize: 10,
            fontWeight: 700,
            zIndex: 10,
            whiteSpace: 'nowrap',
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            border: '1.5px solid var(--color-surface-bg)',
          }}>
            {matchCount}편 일치
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, position: 'relative', zIndex: 1 }}>
          {Array.from({ length: count > 3 ? 2 : 1 }).map((_, row) => (
            <div key={row} style={{ display: 'flex', gap: 4 }}>
              {Array.from({ length: perRow }).map((_, col) => {
                const idx = row * perRow + col
                const slot = slots[idx]
                if (!slot) return null
                return (
                  slot.countLabel ? (
                    <div key={idx} className="po-wrap" style={{ position: 'relative', width: posterW, height: posterH }}>
                      <div style={{
                        width: posterW,
                        height: posterH,
                        borderRadius: 'var(--comp-poster-radius)',
                        backgroundColor: 'var(--color-primary-base)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 15,
                        fontWeight: 800,
                        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)',
                        whiteSpace: 'nowrap',
                      }}>
                        {slot.countLabel}
                      </div>
                      {allMovies && allMovies.length > 0 && <MovieListCard movies={allMovies} />}
                    </div>
                  ) : (
                    <div key={idx} data-movie-id={slot.movie?.id} className={slot.overflow ? 'po-wrap' : 'pm-wrap'} style={{ position: 'relative', width: posterW, height: posterH, opacity: slot.dimmed ? 0.5 : 1 }}>
                      <PosterThumb
                        src={slot.movie?.posterUrl}
                        alt={slot.movie?.title ?? ''}
                        width={posterW}
                        height={posterH}
                        size="sm"
                        overflow={slot.overflow}
                        highlighted={filtersActive && !slot.dimmed && !slot.overflow && !!slot.movie?.matchesFilter}
                      />
                      {slot.dimmed && (
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: 'var(--comp-poster-radius)',
                          backgroundColor: 'rgba(0,0,0,0.45)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <span style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 1.3 }}>
                            조건{'\n'}외
                          </span>
                        </div>
                      )}
                      {slot.movie && !slot.overflow && (
                        <div className="pm-tip">
                          <div className="pm-tip-title">{slot.movie.title}</div>
                          {slot.movie.director?.[0] && (
                            <div className="pm-tip-director">{slot.movie.director[0]}</div>
                          )}
                          {slot.movie.genre.length > 0 && (
                            <div className="pm-tip-genres">
                              {slot.movie.genre.slice(0, 3).map((g) => (
                                <span key={g} className="pm-tip-genre-tag">{g}</span>
                              ))}
                            </div>
                          )}
                          {slot.movie.nation && (
                            <div className="pm-tip-nation">{slot.movie.nation.split(/[,，/·]+/)[0].trim()}</div>
                          )}
                          <div className="pm-tip-tail" />
                        </div>
                      )}
                      {slot.overflow && allMovies && allMovies.length > 0 && <MovieListCard movies={allMovies} />}
                    </div>
                  )
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

type LabelOffset = { x: number; y: number }

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
  // 선택된 극장은 충돌 감지 무시 — 항상 중앙
  const safePosterOffsetX = selected ? 0 : finiteNumber(posterOffsetX)
  const forceMinOne = filtersActive && posterMovies.some(m => m.matchesFilter)
  const slots = posterSlotsForZoom(posterMovies, zoom, filtersActive, forceMinOne)
  const matchCount = filtersActive ? posterMovies.filter(m => m.matchesFilter).length : undefined
  const numRows = slots.length > 3 ? 2 : slots.length > 0 ? 1 : 0
  const usePosterLeft = slots.length > 0 && safePosterOffsetX < -50
  const { w: pW, h: pH } = posterSizeForZoom(zoom, isDesktop)
  const posterH = usePosterLeft || numRows === 0 ? 0 : pH * numRows + 4 * (numRows - 1) + 6

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
      posterHtml =
        `<div style="position:absolute;` +
        `right:calc(50% + ${DOT / 2 + 4}px);` +
        `top:${ANCHOR_Y}px;` +
        `transform:translateY(-50%);">` +
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

  const html = `
    <div style="width:140px;display:flex;flex-direction:column;align-items:center;overflow:visible;position:relative;">
      ${renderToStaticMarkup(<MapPin kind="indie" selected={selected} label={name} labelOffset={labelOffset} dimmed={dimmed} isDark={isDark} />)}
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
  return Math.min(200, Math.max(46, label.length * 13 + 14))
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
  const radiusPx = clusterRadiusForZoom(zoom, isDesktop)

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
  posterMoviesByTheater: Map<string, TheaterPosterMovie[]> = new Map(),
  isDesktop = false,
  filtersActive = false,
): Map<string, number> {
  const offsets = new Map<string, number>()

  const { w: pW, h: pH } = posterSizeForZoom(zoom, isDesktop)
  const baseCount = posterCountForZoom(zoom)
  const POSTER_TOP_FROM_PIN = DOT / 2 + 6

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
      return { id, px, cap: theaterCap(id) }
    })
    .filter((s) => Number.isFinite(s.px.x) && Number.isFinite(s.px.y))

  if (singles.length === 0) return offsets

  const posterRect = (s: { id: string; px: LeafletPoint; cap: number }, offset = offsets.get(s.id) ?? 0): Rect => {
    const { w, h } = dimsForCap(s.cap)
    return [
      s.px.x - w / 2 + finiteNumber(offset),
      s.px.y + POSTER_TOP_FROM_PIN,
      s.px.x + w / 2 + finiteNumber(offset),
      s.px.y + POSTER_TOP_FROM_PIN + h,
    ]
  }

  for (let i = 0; i < singles.length; i++) {
    for (let j = i + 1; j < singles.length; j++) {
      const a = singles[i]
      const b = singles[j]
      const { w: wA, h: hA } = dimsForCap(a.cap)
      const { w: wB, h: hB } = dimsForCap(b.cap)
      const minX = Math.min(wA, wB) / 4
      const minY = Math.min(hA, hB) / 4
      const o = overlap(posterRect(a), posterRect(b))
      if (o.x < minX || o.y < minY) continue
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
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) continue

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
    const minX = wS / 4
    const minY = hS / 4
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
) {
  const dotColor = dimmed ? (isDark ? DIMMED_DOT_DARK : DIMMED_DOT_LIGHT) : 'var(--color-primary-base)'
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
      `border-radius:50%;background:${dotColor};` +
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
    `background:${dotColor};` +
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

/* ── 줌 트래커 ─────────────────────────────────────────────────── */
function ZoomTracker({ onZoom }: { onZoom: (z: number) => void }) {
  useMapEvents({ zoomend: (e) => onZoom(e.target.getZoom()) })
  return null
}

/* ── PC 줌 슬라이더 ──────────────────────────────────────────────── */
const SLIDER_SNAP_STEPS = [0, 17, 33, 50, 67, 83, 100]
const SLIDER_ZOOM_LEVELS = [11, 12, 13, 14, 15, 17, 19]
const SLIDER_TRACK_H = 88

function snapIndexFromZoom(z: number) {
  let best = 0, bestDist = Infinity
  SLIDER_ZOOM_LEVELS.forEach((lv, i) => {
    const d = Math.abs(lv - z)
    if (d < bestDist) { bestDist = d; best = i }
  })
  return best
}

function ZoomSlider({
  zoom,
  mapRef,
}: {
  zoom: number
  mapRef: React.MutableRefObject<LeafletMap | null>
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const stepIdx = snapIndexFromZoom(zoom)
  const pct = SLIDER_SNAP_STEPS[stepIdx]

  const handleTrackMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const track = trackRef.current
    if (!track) return
    const move = (ev: MouseEvent) => {
      const rect = track.getBoundingClientRect()
      const raw = 1 - (ev.clientY - rect.top) / rect.height
      const pctVal = Math.max(0, Math.min(1, raw)) * 100
      let bestIdx = 0, bestDist = Infinity
      SLIDER_SNAP_STEPS.forEach((s, i) => {
        const d = Math.abs(s - pctVal)
        if (d < bestDist) { bestDist = d; bestIdx = i }
      })
      mapRef.current?.setZoom(SLIDER_ZOOM_LEVELS[bestIdx])
    }
    const up = () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    move(e.nativeEvent)
  }, [mapRef])

  const thumbTop = (1 - pct / 100) * SLIDER_TRACK_H - 7

  const stepStep = useCallback((delta: number) => {
    const next = Math.max(0, Math.min(SLIDER_SNAP_STEPS.length - 1, stepIdx + delta))
    mapRef.current?.setZoom(SLIDER_ZOOM_LEVELS[next])
  }, [mapRef, stepIdx])

  const btn: React.CSSProperties = {
    width: 34, height: 34, fontSize: 20, fontWeight: 300, lineHeight: 1,
    border: 'none', background: 'none', cursor: 'pointer', minHeight: 'auto',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--color-text-body)', flexShrink: 0,
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      width: 36, borderRadius: 20,
      border: '1px solid var(--color-border)',
      backgroundColor: 'var(--color-surface-card)',
      boxShadow: 'var(--shadow-md)',
      userSelect: 'none',
    }}>
      <button style={btn} onClick={() => stepStep(1)}>+</button>
      <div style={{ width: 20, height: 1, backgroundColor: 'var(--color-border)', flexShrink: 0 }} />
      <div style={{ padding: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div
        ref={trackRef}
        onMouseDown={handleTrackMouseDown}
        style={{
          position: 'relative', width: 4, height: SLIDER_TRACK_H,
          borderRadius: 2, backgroundColor: 'var(--color-border)', cursor: 'pointer',
        }}
      >
        {/* fill */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: `${pct}%`, borderRadius: 2,
          backgroundColor: 'var(--color-primary-base)',
          transition: 'height 0.08s cubic-bezier(0.34,1.4,0.64,1)',
        }} />
        {/* ticks */}
        {SLIDER_SNAP_STEPS.map((s, i) => (
          <div key={s} style={{
            position: 'absolute',
            left: '50%', top: (1 - s / 100) * SLIDER_TRACK_H - 1,
            transform: 'translateX(-50%)',
            width: i === stepIdx ? 10 : 6, height: 2,
            borderRadius: 1,
            backgroundColor: s <= pct ? 'rgba(255,255,255,0.55)' : 'var(--color-border)',
            transition: 'width 0.08s',
            zIndex: 2, pointerEvents: 'none',
          }} />
        ))}
        {/* thumb */}
        <div style={{
          position: 'absolute', left: '50%',
          top: thumbTop, transform: 'translateX(-50%)',
          width: 14, height: 14, borderRadius: '50%',
          backgroundColor: '#fff',
          border: '2.5px solid var(--color-primary-base)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.22)',
          transition: 'top 0.08s cubic-bezier(0.34,1.4,0.64,1)',
          zIndex: 3, cursor: 'grab', pointerEvents: 'none',
        }} />
      </div>
      </div>
      <div style={{ width: 20, height: 1, backgroundColor: 'var(--color-border)', flexShrink: 0 }} />
      <button style={btn} onClick={() => stepStep(-1)}>−</button>
    </div>
  )
}

/* ── 선택 극장 화면 이탈 감지 ────────────────────────────────── */
function OffScreenTracker({
  theaterLatLng,
  onOffScreen,
}: {
  theaterLatLng: [number, number] | null
  onOffScreen: (v: boolean) => void
}) {
  const map = useMap()
  const cbRef = useRef(onOffScreen)
  cbRef.current = onOffScreen
  useEffect(() => {
    const check = () => {
      if (!theaterLatLng) { cbRef.current(false); return }
      cbRef.current(!map.getBounds().contains(theaterLatLng))
    }
    check()
    map.on('move', check)
    return () => { map.off('move', check) }
  }, [map, theaterLatLng])
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

function useIsDesktopLayout() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  )

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)')
    const update = () => setIsDesktop(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return isDesktop
}

export default function MapView() {
  const router = useRouter()
  const { coords, refetch } = useUserLocation()
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
  })
  const [movieFilter, setMovieFilter] = useState<{ id: string; title: string } | null>(null)
  const [panelStack, setPanelStack] = useState<DesktopPanelState[]>([])
  const desktopPanel = panelStack[panelStack.length - 1] ?? null
  const selectedDateRange = useMemo(() => dateRangeForFilter(filters), [filters])
  const mapShowtimeStart = formatDateParam(selectedDateRange.start)
  const mapShowtimeEnd = formatDateParam(selectedDateRange.end)
  const { data: mapShowtimes = [] } = useMapShowtimes(mapShowtimeStart, mapShowtimeEnd)
  const mapRef = useRef<LeafletMap | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(14)

  // 툴팁 방향: 실시간으로 hover 시점에 화면 위치를 보고 tip-l 클래스를 토글
  const isPanelOpenRef = useRef(false)
  useEffect(() => {
    isPanelOpenRef.current = isDesktopLayout && (selectedId !== null || panelStack.length > 0)
  }, [isDesktopLayout, selectedId, panelStack.length])

  useEffect(() => {
    const handleOver = (e: Event) => {
      const target = e.target as HTMLElement | null
      const wrap = target?.closest('.pm-wrap, .po-wrap') as HTMLElement | null
      if (!wrap) return
      const isPm = wrap.classList.contains('pm-wrap')
      const rect = wrap.getBoundingClientRect()
      const tipW = isPm ? 200 : 280  // gap(10) + tooltip width
      const panelW = isPanelOpenRef.current ? 456 : 0
      const limit = window.innerWidth - panelW
      wrap.classList.toggle('tip-l', rect.right + tipW > limit)
    }
    // leaflet-container가 mount된 뒤 부착 (MapRefSetter가 먼저 실행됨)
    const container = document.querySelector('.leaflet-container')
    if (!container) return
    container.addEventListener('mouseover', handleOver)
    return () => container.removeEventListener('mouseover', handleOver)
  }, [])  // once after mount — reads isPanelOpenRef dynamically

  // 검색 오버레이
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const searchInputRef = useRef<HTMLInputElement>(null)

  const dummyInputRef = useRef<HTMLInputElement>(null)

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
          matchesFilter: matchesMovieFilter && matchesGenre && matchesNation,
        })
      }
    }

    const result = new Map<string, TheaterPosterMovie[]>()
    for (const [theaterId, movieMap] of byTheater) {
      for (const movie of movieMap.values()) {
        if (filters.bookable && !movie.hasAvailableSeats) movie.matchesFilter = false
      }
      result.set(
        theaterId,
        Array.from(movieMap.values()).sort((a, b) =>
          b.showtimeCount - a.showtimeCount || a.title.localeCompare(b.title, 'ko')
        ),
      )
    }
    return result
  }, [filters.bookable, filters.genres, filters.nations, movieFilter, mapShowtimes])

  const filtersActive = filters.bookable || filters.genres.length > 0 || filters.nations.length > 0 || !!movieFilter

  // 상영일정·예매가능 제외한 검색 필터가 활성화 됐을 때 — 해당 극장은 클러스터링 제외
  const searchMatchedTheaterIds = useMemo(() => {
    const isSearchFilter = !!movieFilter || filters.genres.length > 0 || filters.nations.length > 0
    if (!isSearchFilter) return new Set<string>()
    const ids = new Set<string>()
    for (const [theaterId, movies] of theaterPosterMovies) {
      if (movies.some(m => m.matchesFilter)) ids.add(theaterId)
    }
    return ids
  }, [movieFilter, filters.genres, filters.nations, theaterPosterMovies])

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
    setRecentSearches(prev => addToRecent(searchQuery, prev))
    closeSearch()
    setSelectedId(null)
    setDisplayedId(null)
    setSheetExpanded(false)
    mapRef.current?.flyTo([station.lat, station.lng], 16, { duration: 0.75 })
  }, [closeSearch, searchQuery])

  const focusArea = useCallback((area: { name: string; lat: number; lng: number }) => {
    setRecentSearches(prev => addToRecent(searchQuery, prev))
    closeSearch()
    setSelectedId(null)
    setDisplayedId(null)
    setSheetExpanded(false)
    mapRef.current?.flyTo([area.lat, area.lng], 15, { duration: 0.75 })
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
    // 동일좌표 분리 대상 + 검색 매칭 극장(클러스터 제외)
    const splitIds = new Set([...coLoc.keys(), ...searchMatchedTheaterIds])
    // 분리 대상은 오프셋 적용 좌표로 교체 후 클러스터 계산
    const adjustedTheaters = theaters.map((t) => {
      const off = coLoc.get(t.id)
      return off ? { ...t, lat: off.lat, lng: off.lng } : t
    })
    const c = computeClusters(adjustedTheaters, map, zoom, splitIds, coLocGroups, isDesktopLayout)
    const d = computeLabelDirections(c, map)
    const labelO = computeNameLabelOffsets(c, map, d)
    const o = computePosterOffsets(c, map, zoom, d, theaterPosterMovies, isDesktopLayout, filtersActive)
    setClusters(c)
    setPosterOffsets(o)
    setCoLocationOffsets(coLoc)
    setLabelDirections(d)
    setLabelOffsets(labelO)
  }, [zoom, theaters, theaterPosterMovies, isDesktopLayout, searchMatchedTheaterIds, filtersActive])

  // zoom 변경 시 재계산 (줌 애니메이션 끝난 뒤)
  useEffect(() => {
    const id = setTimeout(recompute, 80)
    return () => clearTimeout(id)
  }, [recompute])

  // 검색 필터(영화·장르·국가) 적용 시 → 매칭 극장이 모두 보이도록 뷰 이동
  useEffect(() => {
    const isSearchFilter = !!movieFilter || filters.genres.length > 0 || filters.nations.length > 0
    if (!isSearchFilter) return
    const map = mapRef.current
    if (!map) return
    const matchedTheaters = theaters.filter(t => {
      return (theaterPosterMovies.get(t.id) ?? []).some(m => m.matchesFilter)
    })
    if (matchedTheaters.length === 0) return
    if (matchedTheaters.length === 1) {
      const t = matchedTheaters[0]
      map.flyTo([t.lat, t.lng], Math.max(map.getZoom(), 15), { duration: 0.75 })
      return
    }
    const bounds = L.latLngBounds(matchedTheaters.map(t => [t.lat, t.lng] as [number, number]))
    map.flyToBounds(bounds, { padding: [80, 80], maxZoom: 16, duration: 0.75 })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movieFilter, filters.genres, filters.nations])

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

  // 시트/패널이 열릴 때 남은 영역의 중심으로 flyTo
  const flyToForTheater = useCallback((latlng: [number, number], zoom: number, duration: number) => {
    const map = mapRef.current
    if (!map) return
    // desktop: 오른쪽 패널 440px → 왼쪽으로 220px 이동
    // mobile:  하단 시트 300px → 위쪽으로 150px 이동
    const dx = isDesktopLayout ? -220 : 0
    const dy = isDesktopLayout ? 0 : -150
    const targetPx = map.project(L.latLng(latlng), zoom)
    const newCenter = map.unproject(L.point(targetPx.x - dx, targetPx.y - dy), zoom)
    map.flyTo(newCenter, zoom, { duration })
  }, [isDesktopLayout])

  const focusTheater = useCallback((theater: Theater) => {
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

  useEffect(() => {
    if (isDesktopLayout && selectedTheater) setSheetExpanded(true)
  }, [isDesktopLayout, selectedTheater])

  // 영화 상세 페이지에서 뒤로가기 시 ?theater= 파라미터로 극장 시트 복원
  const restoredTheaterRef = useRef(false)
  useEffect(() => {
    if (restoredTheaterRef.current || theaters.length === 0) return
    const theaterParam = new URLSearchParams(window.location.search).get('theater')
    if (!theaterParam) { restoredTheaterRef.current = true; return }
    const theater = theaters.find((t) => t.id === theaterParam)
    if (!theater) return
    restoredTheaterRef.current = true
    focusTheater(theater)
    const url = new URL(window.location.href)
    url.searchParams.delete('theater')
    window.history.replaceState({}, '', url.toString())
  }, [theaters, focusTheater])

  // 영화 상세 / 바텀시트에서 ?movie= 파라미터로 영화 필터 복원
  const restoredMovieRef = useRef(false)
  useEffect(() => {
    if (restoredMovieRef.current || movies.length === 0) return
    const movieParam = new URLSearchParams(window.location.search).get('movie')
    if (!movieParam) { restoredMovieRef.current = true; return }
    const movie = movies.find((m) => m.id === movieParam)
    if (!movie) return
    restoredMovieRef.current = true
    setMovieFilter({ id: movie.id, title: movie.title })
    const url = new URL(window.location.href)
    url.searchParams.delete('movie')
    window.history.replaceState({}, '', url.toString())
  }, [movies])

  // 극장 선택 시 → 첫 번째 영화 선택 + 시트 collapsed로 열기
  const handlePinClick = useCallback((theaterId: string, clickedMovieId?: string) => {
    if (selectedId === theaterId) {
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
        flyToForTheater(
          [theater.lat, theater.lng],
          Math.max(currentZoom, 16),
          0.5,
        )
      }
    }
  }, [selectedId, closeSheet, flyToForTheater, isDesktopLayout, movieFilter, theaters])

  // FAB 버튼 bottom: collapsed = COLLAPSED_H(300) + 여유 16 = 316
  // expanded / 시트 없음 = safe area 위 32px
  const fabBottom = !isDesktopLayout && selectedTheater && !sheetExpanded && !sheetExiting ? 316 : 32
  const hasSearchResults = theaterResults.length > 0 || stationResults.length > 0 || movieResults.length > 0 || relatedDirectorResults.length > 0 || areaResults.length > 0

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
              onClick={() => focusTheater(theater)}
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
              <span style={{ color: 'var(--color-text-caption)', fontSize: 18, lineHeight: 1 }}>›</span>
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
                setRecentSearches(prev => addToRecent(searchQuery, prev))
                setMovieFilter({ id: movie.id, title: movie.title })
                closeSearch()
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
              <span style={{ color: 'var(--color-text-caption)', fontSize: 18, lineHeight: 1 }}>›</span>
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
                      onClick={() => focusTheater(t)}
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
    <div style={{ position: 'relative', width: '100%', height: '100dvh' }}>
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
          maxZoom={19}
        />
        <MapRefSetter mapRef={mapRef} />
        <ZoomTracker onZoom={setZoom} />
        <OffScreenTracker
          theaterLatLng={selectedTheater ? [selectedTheater.lat, selectedTheater.lng] : null}
          onOffScreen={setTheaterOffScreen}
        />

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
            icon={makeStationIcon(station, isDark, zoom)}
            interactive={false}
            zIndexOffset={-1000}
          />
        ))}

        {clusters.map((cluster) => {
          // 클러스터 마커 (2개 이상) — 클릭 시 줌인
          if (cluster.theaters.length > 1) {
            const clusterDimmed = filtersActive && cluster.theaters.every(
              (t) => (theaterPosterMovies.get(t.id) ?? []).every(m => !m.matchesFilter)
            )
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
                    const splitZoom = findSplitZoom(cluster.theaters, map, currentZoom, isDesktopLayout)
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

      {/* 검색창 + 필터 칩 */}
      {/* PC 로고 — 상단 중앙 */}
      {isDesktopLayout && (
        <div aria-label="영화볼지도" role="img" style={{
          position: 'absolute',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1001,
          pointerEvents: 'none',
          width: 100,
          height: 34,
          backgroundColor: 'var(--color-text-primary)',
          WebkitMaskImage: 'url(/logo.svg)',
          maskImage: 'url(/logo.svg)',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          filter: isDark
            ? 'drop-shadow(0 2px 8px rgba(0,0,0,0.7))'
            : 'drop-shadow(0 2px 8px rgba(0,0,0,0.25))',
        }} />
      )}

      {/* 검색바 — PC: maxWidth 440 */}
      <div style={{
        position: 'absolute',
        top: isDesktopLayout ? 16 : 'max(0px, env(safe-area-inset-top))',
        left: 0,
        right: 0,
        zIndex: 1001,
        pointerEvents: 'none',
        maxWidth: isDesktopLayout ? 440 : undefined,
        minWidth: isDesktopLayout ? 320 : undefined,
      }}>
        <div style={{ padding: isDesktopLayout ? '0 16px' : '16px 16px 0', pointerEvents: 'auto' }}>
          <div style={{ boxShadow: 'var(--shadow-sheet)', borderRadius: 'var(--comp-search-radius)' }}>
            <SearchBarButton
              placeholder="영화, 감독, 역, 영화관 검색"
              onClick={openSearch}
            />
          </div>
        </div>
      </div>

      {/* 필터칩 — maxWidth 없음, 드롭다운이 화면 우측까지 자유롭게 펼쳐짐 */}
      <div style={{
        position: 'absolute',
        top: isDesktopLayout
          ? 16 + 44 + 8  /* searchbar top(16) + height(44) + gap(8) */
          : 'max(0px, env(safe-area-inset-top))',
        left: 0,
        right: 0,
        zIndex: 1001,
        pointerEvents: 'none',
        marginTop: isDesktopLayout ? undefined : 16 + 44 + 8, /* mobile: padding(16) + height(44) + gap(8) */
      }}>
        <div style={{ pointerEvents: 'auto' }}>
          <FilterBar
            desktop={isDesktopLayout}
            onChange={setFilters}
            nationOptions={nationOptions}
            movieFilter={movieFilter}
            onMovieFilterClear={() => setMovieFilter(null)}
          />
        </div>
      </div>

      {/* 테마 토글 — PC: 우상단, 모바일: 좌하단 */}
      {/* TODO: 모바일 테마 토글은 추후 제거 예정 */}
      <button
        onClick={() => void setTheme(isDark ? 'light' : 'dark')}
        aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
        style={{
          position: 'absolute',
          top: isDesktopLayout ? 16 : undefined,
          right: isDesktopLayout ? 16 : undefined,
          bottom: isDesktopLayout ? undefined : `max(${fabBottom + 8}px, calc(env(safe-area-inset-bottom) + ${fabBottom + 8}px))`,
          left: isDesktopLayout ? undefined : 16,
          zIndex: 1000,
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
        }}
      >
        {/* 슬라이딩 노브 */}
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
        {/* 배경 아이콘 — 라이트 */}
        <div style={{ width: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-warning)', opacity: isDark ? 0.25 : 0 }}>
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="5" fill="currentColor" stroke="none"/>
            <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
        </div>
        {/* 배경 아이콘 — 다크 */}
        <div style={{ width: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-caption)', opacity: isDark ? 0 : 0.35 }}>
          <svg width={13} height={13} viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
          </svg>
        </div>
      </button>

      {/* PC 줌 슬라이더 — 테마 토글 아래 우측 */}
      {/* 모바일 지도 하단 로고 워터마크 */}
      {!isDesktopLayout && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 'max(20px, env(safe-area-inset-bottom))',
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
      )}

      {/* 검색 오버레이 — same page, iOS 키보드 대응 */}
      {searchOpen && (
        <>
        {isDesktopLayout && (
          <button
            onClick={closeSearch}
            aria-label="검색 닫기"
            style={{
              position: 'absolute',
              left: 456,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 2001,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 72,
              background: 'var(--color-surface-card)',
              border: '1px solid var(--color-border)',
              borderLeft: 'none',
              borderRadius: '0 12px 12px 0',
              boxShadow: '4px 0 12px rgba(0,0,0,0.10)',
              cursor: 'pointer',
              color: 'var(--color-text-caption)',
              padding: 0,
              minHeight: 'unset',
            }}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}
        <div style={{
          position: 'absolute',
          inset: isDesktopLayout ? '16px auto 16px 16px' : 0,
          width: isDesktopLayout ? 440 : 'auto',
          maxWidth: isDesktopLayout ? 'calc(100vw - 32px)' : undefined,
          backgroundColor: 'var(--color-surface-bg)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 2000,
          border: isDesktopLayout ? '1px solid var(--color-border)' : undefined,
          borderRadius: isDesktopLayout ? 20 : 0,
          boxShadow: isDesktopLayout ? 'var(--shadow-sheet)' : undefined,
          overflow: 'hidden',
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
              placeholder="영화, 감독, 역, 영화관 검색"
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
                          try { localStorage.removeItem(RECENT_KEY) } catch {}
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
        </>
      )}

      {/* 줌 + 현위치 */}
      <div style={{
        position: 'absolute',
        right: isDesktopLayout && selectedTheater ? 472 : 16,
        bottom: fabBottom,
        zIndex: 1000,
        display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center',
        transition: 'right 0.24s ease, bottom 0.38s cubic-bezier(0.32, 0.72, 0, 1)',
      }}>
        {isDesktopLayout ? (
          <ZoomSlider zoom={zoom} mapRef={mapRef} />
        ) : (
          <>
            <FabRound onClick={() => mapRef.current?.zoomIn()}><IcoPlus /></FabRound>
            <FabRound onClick={() => mapRef.current?.zoomOut()}><IcoMinus /></FabRound>
          </>
        )}
        <div style={{ height: isDesktopLayout ? 0 : 8 }} />
        <FabRound onClick={handleLocate}><IcoLocate /></FabRound>
      </div>

      {/* 선택 극장 화면 이탈 시 돌아가기 pill */}
      {selectedId && !sheetExiting && !(sheetExpanded && !isDesktopLayout) && theaterOffScreen && !searchOpen && selectedTheater && (
        <div style={{
          position: 'absolute',
          left: 0,
          right: isDesktopLayout ? 456 : 0,
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
      {selectedTheater && !desktopPanel && (
        <TheaterSheet
          theater={selectedTheater}
          expanded={sheetExpanded}
          exiting={sheetExiting}
          presentation={isDesktopLayout ? 'panel' : 'sheet'}
          selectedMovieId={selectedMovieId}
          onMovieSelect={setSelectedMovieId}
          onExpand={() => setSheetExpanded(true)}
          onCollapse={() => setSheetExpanded(false)}
          onClose={closeSheet}
          onMovieSearch={(movieId, movieTitle) => setMovieFilter({ id: movieId, title: movieTitle })}
          onMovieDetailOpen={isDesktopLayout ? (id) => openDesktopPanel({ type: 'movie', id }) : undefined}
          onDirectorOpen={isDesktopLayout ? (name) => openDesktopPanel({ type: 'director', name }) : undefined}
          favorited={false}
          onFavorite={() => { /* Phase 4 */ }}
          mapFilters={{ genres: filters.genres, nations: filters.nations }}
        />
      )}

      {/* PC 영화/감독 상세 패널 */}
      {isDesktopLayout && desktopPanel && (
        <div style={{
          position: 'absolute',
          top: 16,
          right: 16,
          bottom: 16,
          width: 440,
          maxWidth: 'calc(100vw - 32px)',
          zIndex: 1050,
          boxShadow: '0 18px 54px rgba(20, 15, 10, 0.18)',
          borderRadius: 20,
          overflow: 'hidden',
        }}>
          <DesktopDetailPanel
            panel={desktopPanel}
            onClose={closeDesktopPanel}
            onBack={panelStack.length > 1 || selectedTheater ? () => window.history.back() : undefined}
            onNavigate={openDesktopPanel}
            onMovieFilterOnMap={(id, title) => {
              setMovieFilter({ id, title })
              closeDesktopPanel()
            }}
          />
        </div>
      )}
    </div>
  )
}
