/**
 * 역 데이터에는 있는데 노선 데이터에 없는 노선·지선 구간을 OSM에서 받아 subway-lines.json에 더한다.
 * 기존 노선은 건드리지 않고, 이 스크립트가 넣은 선(source: 'osm')만 교체한다.
 * 기존 노선이 있으면 그 선에서 벗어난 구간만 더한다.
 * Usage: npx tsx scripts/fetch-overpass-missing-subway-lines.ts
 * 데이터 출처: OpenStreetMap contributors (ODbL)
 */
import { readFile, writeFile } from 'node:fs/promises'

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const LINES_PATH = 'src/data/subway-lines.json'
const BBOX = '34.9,126.3,38.1,129.4'

/** 복선은 방향별 선로가 따로 있다 — 이미 받은 선로에서 이 거리 안이면 같은 구간으로 본다 */
const DUPLICATE_TRACK_METERS = 25
const SIMPLIFY_METERS = 4
/** 기존 노선에 더하는 구간 중 이보다 짧으면 역 구내 선로 조각으로 보고 버린다 */
const MIN_ADDED_SECTION_METERS = 300
const METERS_PER_DEG_LAT = 110_540
const METERS_PER_DEG_LNG = 88_000

/** line 값은 stations.lines와 같아야 역이 노선에 붙는다 */
const TARGETS: Array<{ line: string; pattern: RegExp }> = [
  { line: '경의중앙선', pattern: /^경의·중앙선/ },
  { line: '수인분당선', pattern: /^수인·분당선/ },
  { line: '인천2호선', pattern: /^인천 도시철도 2호선/ },
  { line: '경춘선', pattern: /^수도권 전철 경춘선/ },
  { line: '용인경전철', pattern: /^용인 경전철/ },
  { line: '의정부경전철', pattern: /^의정부경전철/ },
  { line: '우이신설선', pattern: /^우이신설선/ },
  { line: '공항철도', pattern: /^인천국제공항철도/ },
  { line: '서울1호선', pattern: /^수도권 전철 1호선/ },
  { line: '서울2호선', pattern: /^서울 지하철 2호선/ },
  { line: '서울3호선', pattern: /^수도권 전철 3호선/ },
  { line: '서울4호선', pattern: /^수도권 전철 4호선/ },
  { line: '서울5호선', pattern: /^서울 지하철 5호선/ },
  { line: '서울6호선', pattern: /^서울 지하철 6호선/ },
  { line: '서울7호선', pattern: /^서울 지하철 7호선/ },
  { line: '서울8호선', pattern: /^서울 지하철 8호선/ },
  { line: '서울9호선', pattern: /^서울 지하철 9호선/ },
  { line: '인천1호선', pattern: /^인천 도시철도 1호선/ },
  { line: '부산1호선', pattern: /^부산 도시철도 1호선/ },
  { line: '부산2호선', pattern: /^부산 도시철도 2호선/ },
  { line: '부산3호선', pattern: /^부산 도시철도 3호선/ },
  { line: '대구1호선', pattern: /^대구 도시철도 1호선/ },
  { line: '대구2호선', pattern: /^대구 도시철도 2호선/ },
  { line: '광주1호선', pattern: /^광주 도시철도 1호선/ },
  { line: '대전1호선', pattern: /^대전 도시철도 1호선/ },
]

type Point = [number, number]
type Member = { type: string; ref: number; role: string; geometry?: Array<{ lat: number; lon: number }> }
type LineFeature = { properties?: { source?: string; line?: string }; geometry: { type: string; coordinates: Point[][] } }
type Relation = { id: number; tags: Record<string, string>; members: Member[] }

function distanceMeters(a: Point, b: Point) {
  return Math.hypot((a[0] - b[0]) * METERS_PER_DEG_LNG, (a[1] - b[1]) * METERS_PER_DEG_LAT)
}

function distanceToSegment(p: Point, a: Point, b: Point) {
  const dx = (b[0] - a[0]) * METERS_PER_DEG_LNG
  const dy = (b[1] - a[1]) * METERS_PER_DEG_LAT
  const px = (p[0] - a[0]) * METERS_PER_DEG_LNG
  const py = (p[1] - a[1]) * METERS_PER_DEG_LAT
  const lengthSq = dx * dx + dy * dy
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, (px * dx + py * dy) / lengthSq))
  return Math.hypot(px - t * dx, py - t * dy)
}

/** Douglas-Peucker */
function simplify(points: Point[], tolerance: number): Point[] {
  if (points.length < 3) return points
  let farthest = 0
  let index = 0
  for (let i = 1; i < points.length - 1; i += 1) {
    const d = distanceToSegment(points[i], points[0], points[points.length - 1])
    if (d > farthest) {
      farthest = d
      index = i
    }
  }
  if (farthest <= tolerance) return [points[0], points[points.length - 1]]
  return [...simplify(points.slice(0, index + 1), tolerance).slice(0, -1), ...simplify(points.slice(index), tolerance)]
}

/** 여러 방향·계통 relation의 선로에서 겹치지 않는 way만 고른다 */
function uniqueTracks(relations: Relation[], existing: Point[][]): Point[][] {
  const seenWays = new Set<number>()
  const accepted: Point[][] = [...existing]
  const trackWays = (r: Relation) => r.members.filter((m) => m.type === 'way' && !/platform/.test(m.role) && (m.geometry?.length ?? 0) >= 2)
  const ordered = [...relations].sort((a, b) => trackWays(b).length - trackWays(a).length)

  for (const relation of ordered) {
    for (const way of trackWays(relation)) {
      if (seenWays.has(way.ref)) continue
      seenWays.add(way.ref)
      const points = way.geometry!.map((n) => [n.lon, n.lat] as Point)
      const isNew = points.some((p) => !accepted.some((track) => track.some((q, i) => i > 0 && distanceToSegment(p, track[i - 1], q) <= DUPLICATE_TRACK_METERS)))
      if (isNew) accepted.push(points)
    }
  }
  return accepted.slice(existing.length)
}

function stitch(ways: Point[][]): Point[][] {
  const remaining = ways.map((w) => [...w])
  const chains: Point[][] = []
  const near = (a: Point, b: Point) => distanceMeters(a, b) < 1
  while (remaining.length > 0) {
    let chain = remaining.shift()!
    let changed = true
    while (changed) {
      changed = false
      for (let i = 0; i < remaining.length; i += 1) {
        const way = remaining[i]
        const head = chain[0]
        const tail = chain[chain.length - 1]
        if (near(tail, way[0])) chain = [...chain, ...way.slice(1)]
        else if (near(tail, way[way.length - 1])) chain = [...chain, ...[...way].reverse().slice(1)]
        else if (near(head, way[way.length - 1])) chain = [...way.slice(0, -1), ...chain]
        else if (near(head, way[0])) chain = [...[...way].reverse().slice(0, -1), ...chain]
        else continue
        remaining.splice(i, 1)
        changed = true
        break
      }
    }
    chains.push(chain)
  }
  return chains
}

async function fetchRelations(): Promise<Relation[]> {
  const query = `[out:json][timeout:300];relation["type"="route"]["route"~"^(train|light_rail|subway)$"]["name"~"호선|경의|수인|경춘|용인|의정부경전철|우이신설|인천국제공항철도"](${BBOX});out geom;`
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'indi-movie-web subway-lines-builder' },
    body: `data=${encodeURIComponent(query)}`,
  })
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`)
  const json = (await res.json()) as { elements: Relation[] }
  return json.elements
}

async function main() {
  const collection = JSON.parse(await readFile(LINES_PATH, 'utf8')) as { features: LineFeature[] }
  const kept = collection.features.filter((f) => f.properties?.source !== 'osm')
  const relations = await fetchRelations()

  const added = TARGETS.flatMap(({ line, pattern }) => {
    const matched = relations.filter((r) => pattern.test(r.tags.name ?? ''))
    if (matched.length === 0) throw new Error(`relation 없음: ${line}`)
    const existing = kept.filter((f) => f.properties?.line === line).flatMap((f) => f.geometry.coordinates)
    const minLength = existing.length > 0 ? MIN_ADDED_SECTION_METERS : 0
    const coordinates = stitch(uniqueTracks(matched, existing))
      .filter((chain) => chain.slice(1).reduce((sum, p, i) => sum + distanceMeters(chain[i], p), 0) >= minLength)
      .map((chain) => simplify(chain, SIMPLIFY_METERS).map(([lng, lat]) => [Number(lng.toFixed(5)), Number(lat.toFixed(5))]))
    console.log(`${line}: relation ${matched.length}, 선 ${coordinates.length}, 점 ${coordinates.reduce((n, c) => n + c.length, 0)}`)
    if (coordinates.length === 0) return []
    return [{
      type: 'Feature',
      properties: { source: 'osm', line, lineCode: line, name: line },
      geometry: { type: 'MultiLineString', coordinates },
    }]
  })

  await writeFile(LINES_PATH, JSON.stringify({ ...collection, features: [...kept, ...added] }))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
