import type { Feature, Geometry } from 'geojson'

/** 이보다 멀면 데이터 오류나 노선 구간 누락으로 보고 옮기지 않는다. 실측상 200~1000m 구간은 5곳뿐이다 */
export const STATION_SNAP_MAX_METERS = 200

const METERS_PER_DEG_LAT = 110_540
const METERS_PER_DEG_LNG_AT_EQUATOR = 111_320

type Position = number[]
type LineFeature = Feature<Geometry, { line?: string }>

export interface StationForSnap {
  id: string
  lat: number
  lng: number
  lines: string[]
}

export interface LatLng {
  lat: number
  lng: number
}

/** 역 데이터의 '2호선'과 노선 데이터의 '서울2호선'을 같은 이름으로 맞춘다 */
export function normalizeLineName(line: string): string {
  const name = line.replace(/\s+/g, '')
  return /^[1-9]호선$/.test(name) ? `서울${name}` : name
}

function lineStrings(geometry: Geometry): Position[][] {
  if (geometry.type === 'LineString') return [geometry.coordinates]
  if (geometry.type === 'MultiLineString') return geometry.coordinates
  return []
}

function nearestOnSegment(point: LatLng, a: Position, b: Position) {
  const metersPerLng = METERS_PER_DEG_LNG_AT_EQUATOR * Math.cos((point.lat * Math.PI) / 180)
  const ax = (a[0] - point.lng) * metersPerLng
  const ay = (a[1] - point.lat) * METERS_PER_DEG_LAT
  const dx = (b[0] - a[0]) * metersPerLng
  const dy = (b[1] - a[1]) * METERS_PER_DEG_LAT
  const lengthSq = dx * dx + dy * dy
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengthSq))
  return {
    meters: Math.hypot(ax + t * dx, ay + t * dy),
    lat: a[1] + t * (b[1] - a[1]),
    lng: a[0] + t * (b[0] - a[0]),
  }
}

/**
 * 역을 자기 노선의 가장 가까운 지점으로 옮기는 함수를 만든다.
 * 다른 노선에는 붙이지 않는다. 자기 노선이 없거나 maxMeters보다 멀면 원래 좌표를 돌려준다.
 */
export function createStationSnapper(features: LineFeature[], maxMeters = STATION_SNAP_MAX_METERS) {
  const linesByName = new Map<string, Position[][]>()
  for (const feature of features) {
    if (!feature.properties?.line) continue
    const name = normalizeLineName(feature.properties.line)
    linesByName.set(name, [...(linesByName.get(name) ?? []), ...lineStrings(feature.geometry)])
  }

  const cache = new Map<string, LatLng>()

  return function snapStation(station: StationForSnap): LatLng {
    const cached = cache.get(station.id)
    if (cached) return cached

    let best: ReturnType<typeof nearestOnSegment> | null = null
    for (const line of station.lines) {
      for (const coords of linesByName.get(normalizeLineName(line)) ?? []) {
        for (let i = 1; i < coords.length; i += 1) {
          const candidate = nearestOnSegment(station, coords[i - 1], coords[i])
          if (!best || candidate.meters < best.meters) best = candidate
        }
      }
    }

    const position = best && best.meters <= maxMeters
      ? { lat: best.lat, lng: best.lng }
      : { lat: station.lat, lng: station.lng }
    cache.set(station.id, position)
    return position
  }
}
