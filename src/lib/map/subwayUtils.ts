import L from 'leaflet'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import type { Station } from '@/types/api'
import subwayLinesData from '@/data/subway-lines.json'

export interface SubwayLineProperties {
  line?: string
  lineCode?: string
  name?: string
  color?: string
  stroke?: string
  sourceColor?: string
  source?: string
  route?: string
  routeName?: string
  line_name?: string
  lineName?: string
  노선?: string
  노선명?: string
  호선?: string
}

export const SUBWAY_LINE_MIN_ZOOM = 15
export const STATION_PIN_MIN_ZOOM = 15
export const STATION_PIN_FULL_ZOOM = 17

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

export function subwayLineLabel(properties: SubwayLineProperties = {}): string {
  return [
    properties.lineCode, properties.line, properties.name,
    properties.route, properties.routeName, properties.line_name,
    properties.lineName, properties.노선, properties.노선명, properties.호선,
  ]
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .join(' ')
}

export function subwayLineColor(properties: SubwayLineProperties = {}, isDark = false): string {
  const label = subwayLineLabel(properties)
  const normalized = label.replace(/\s+/g, '')
  const match = Object.entries(SEOUL_SUBWAY_LINE_COLORS)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([key]) => normalized.includes(key.replace(/\s+/g, '')))
  if (match) return match[1][isDark ? 'dark' : 'light']
  const explicitColor = properties.color ?? properties.stroke ?? properties.sourceColor
  if (explicitColor && /^#|rgb|hsl|var\(/i.test(explicitColor)) return explicitColor
  return 'var(--color-primary-base)'
}

const REGIONAL_SUBWAY_PATTERN = /(부산|대구|광주|대전|인천)\d*호선/
function isSubwayLineFeature(feature: Feature<Geometry, SubwayLineProperties>): boolean {
  const label = subwayLineLabel(feature.properties)
  if (!label) return false
  if (feature.properties?.source === 'regional') return true
  if (NON_SUBWAY_LINE_PATTERN.test(label) && !SUBWAY_LINE_PATTERN.test(label) && !REGIONAL_SUBWAY_PATTERN.test(label)) return false
  const normalized = label.replace(/\s+/g, '')
  const hasKnownCode = Object.keys(SEOUL_SUBWAY_LINE_COLORS)
    .sort((a, b) => b.length - a.length)
    .some((key) => normalized === key.replace(/\s+/g, ''))
  return hasKnownCode || SUBWAY_LINE_PATTERN.test(label) || REGIONAL_SUBWAY_PATTERN.test(label)
}

export const SUBWAY_LINES = {
  ...(subwayLinesData as FeatureCollection<Geometry, SubwayLineProperties>),
  features: (subwayLinesData as FeatureCollection<Geometry, SubwayLineProperties>).features.filter(isSubwayLineFeature),
}

export function subwayLineStyle(feature: Feature<Geometry, SubwayLineProperties> | undefined, isDark: boolean) {
  return {
    color: subwayLineColor(feature?.properties, isDark),
    weight: 2,
    opacity: 0.7,
    lineCap: 'round' as const,
    lineJoin: 'round' as const,
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

const _stationIconCache = new Map<string, L.DivIcon>()

export function makeStationIcon(station: Station, isDark: boolean, zoom: number) {
  const compact = zoom < STATION_PIN_FULL_ZOOM
  const cacheKey = `${station.id}|${isDark ? 1 : 0}|${compact ? 1 : 0}`
  const cached = _stationIconCache.get(cacheKey)
  if (cached) return cached
  const DOT = compact ? 11 : 15
  const LABEL_H = compact ? 12 : 16
  const GAP = compact ? 2 : 4
  const FONT_SIZE = compact ? 9 : 11
  const ANCHOR_Y = DOT / 2
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
      <div style="-webkit-text-stroke:${compact ? 0.55 : 0.7}px rgba(0,0,0,0.88);paint-order:stroke fill;font-size:${FONT_SIZE}px;font-weight:600;white-space:nowrap;color:#fff;line-height:${LABEL_H}px;text-shadow:0 1px 1px rgba(0,0,0,0.45);">
        ${escapeHtml(station.name)}
      </div>
    </div>
  `
  const icon = L.divIcon({ html, className: '', iconSize: [120, LABEL_H + GAP + DOT], iconAnchor: [60, ANCHOR_Y] })
  _stationIconCache.set(cacheKey, icon)
  return icon
}
