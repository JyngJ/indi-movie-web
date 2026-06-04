/**
 * Overpass API에서 지역 지하철 실제 선로 geometry 가져오기
 * 역 좌표 순서 연결 방식 대체 → 실제 선로 곡선 포함
 * Usage: npx tsx scripts/fetch-overpass-subway-lines.ts
 */
import { readFile, writeFile } from 'node:fs/promises'

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

const CITIES = [
  // Seoul: bbox 내 route=subway 전부 수용 (수도권 전철 포함)
  { key: 'seoul',   bbox: [37.40, 126.80, 37.70, 127.20] as const, prefix: '서울', nameFilter: null },
  { key: 'busan',   bbox: [35.0,  128.8,  35.4,  129.3]  as const, prefix: '부산', nameFilter: /부산/ },
  { key: 'daegu',   bbox: [35.7,  128.4,  36.1,  128.8]  as const, prefix: '대구', nameFilter: /대구/ },
  { key: 'gwangju', bbox: [35.0,  126.7,  35.3,  127.0]  as const, prefix: '광주', nameFilter: /광주/ },
  { key: 'daejeon', bbox: [36.2,  127.2,  36.5,  127.5]  as const, prefix: '대전', nameFilter: /대전/ },
  // 인천 bbox는 서울 수도권 전철도 포함 → name에 "인천" 있는 것만
  { key: 'incheon', bbox: [37.3,  126.4,  37.6,  126.9]  as const, prefix: '인천', nameFilter: /인천/ },
]

const COLOR_FALLBACK: Record<string, string> = {
  // Seoul numbered lines
  '서울1': '#0052A4', '서울2': '#00A84D', '서울3': '#EF7C1C',
  '서울4': '#00A5DE', '서울5': '#996CAC', '서울6': '#CD7C2E',
  '서울7': '#747F00', '서울8': '#E6186C', '서울9': '#BB8336',
  // Regional cities
  '부산1': '#F37021', '부산2': '#00A650', '부산3': '#C4A000', '부산4': '#F5A200',
  '대구1': '#D93F5B', '대구2': '#00A8E0', '대구3': '#FFCC00',
  '광주1': '#00A650',
  '대전1': '#00A8E0',
  '인천1': '#7CA8D5', '인천2': '#ED8B00',
}

// 번호 없는 명칭 노선 (신분당선, 경의중앙선 등)
const NAMED_LINES: Array<{ pattern: RegExp; key: string; color: string }> = [
  { pattern: /신분당/,         key: '신분당선',    color: '#D4003B' },
  { pattern: /수인분당|분당/,  key: '수인분당선',  color: '#F5A200' },
  { pattern: /경의중앙/,       key: '경의중앙선',  color: '#77C4A3' },
  { pattern: /공항철도|AREX/i, key: '공항철도',    color: '#0090D2' },
  { pattern: /경춘/,           key: '경춘선',      color: '#0C8E72' },
  { pattern: /우이신설/,       key: '우이신설선',  color: '#B0AD00' },
  { pattern: /신림/,           key: '신림선',      color: '#6789CA' },
  { pattern: /서해/,           key: '서해선',      color: '#81A914' },
  { pattern: /경강/,           key: '경강선',      color: '#003DA5' },
  { pattern: /GTX-A/i,         key: 'GTX-A',       color: '#9B5AA5' },
  { pattern: /김포/,           key: '김포골드라인', color: '#A17800' },
  { pattern: /에버라인|용인경전철/, key: '에버라인', color: '#50BB31' },
  { pattern: /의정부/,         key: '의정부경전철', color: '#FDA600' },
]

type OverpassNode = { lat: number; lon: number }
type OverpassMember = {
  type: 'way' | 'node' | 'relation'
  ref: number
  role: string
  geometry?: OverpassNode[]
}
type OverpassRelation = {
  type: 'relation'
  id: number
  tags: Record<string, string>
  members: OverpassMember[]
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function queryOverpassRaw(bbox: readonly [number, number, number, number]): Promise<OverpassRelation[]> {
  const [s, w, n, e] = bbox
  const query = `[out:json][timeout:120];
(
  relation["route"="subway"](${s},${w},${n},${e});
);
out geom;`

  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json, */*',
      'User-Agent': 'subway-lines-builder/1.0',
    },
    body: `data=${encodeURIComponent(query)}`,
  })
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}: ${await res.text()}`)
  const json = await res.json() as { elements: unknown[] }
  return json.elements.filter((e): e is OverpassRelation =>
    typeof e === 'object' && e !== null && (e as OverpassRelation).type === 'relation'
  )
}

async function queryOverpass(bbox: readonly [number, number, number, number], retries = 3): Promise<OverpassRelation[]> {
  for (let i = 0; i < retries; i++) {
    try {
      return await queryOverpassRaw(bbox)
    } catch (err) {
      if (i < retries - 1) {
        console.log(`  재시도 ${i + 1}/${retries - 1}... (5초 대기)`)
        await sleep(5000)
      } else throw err
    }
  }
  return []
}

// 같은 노선 중복 relation → way 수 가장 많은 것 1개만 유지
function deduplicateRelations(relations: OverpassRelation[]): OverpassRelation[] {
  const byRef = new Map<string, OverpassRelation>()
  for (const rel of relations) {
    const ref = rel.tags['ref'] ?? rel.tags['name'] ?? String(rel.id)
    const wayCount = rel.members.filter(m => m.type === 'way').length
    const existing = byRef.get(ref)
    if (!existing || wayCount > existing.members.filter(m => m.type === 'way').length) {
      byRef.set(ref, rel)
    }
  }
  return [...byRef.values()]
}

// 연결된 way들을 연속 선으로 이어붙이기
function stitchWays(wayGeometries: OverpassNode[][]): [number, number][][] {
  if (wayGeometries.length === 0) return []

  const segs = wayGeometries.map(nodes => ({
    coords: nodes.map(n => [n.lon, n.lat] as [number, number]),
    used: false,
  }))

  const result: [number, number][][] = []

  while (segs.some(s => !s.used)) {
    const startIdx = segs.findIndex(s => !s.used)
    segs[startIdx].used = true
    let chain = [...segs[startIdx].coords]

    let changed = true
    while (changed) {
      changed = false
      for (const seg of segs) {
        if (seg.used) continue
        const cEnd = chain[chain.length - 1]
        const cStart = chain[0]
        const sStart = seg.coords[0]
        const sEnd = seg.coords[seg.coords.length - 1]
        const eq = (a: [number, number], b: [number, number]) =>
          Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6

        if (eq(cEnd, sStart)) {
          chain = [...chain, ...seg.coords.slice(1)]
          seg.used = true; changed = true
        } else if (eq(cEnd, sEnd)) {
          chain = [...chain, ...[...seg.coords].reverse().slice(1)]
          seg.used = true; changed = true
        } else if (eq(cStart, sEnd)) {
          chain = [...seg.coords.slice(0, -1), ...chain]
          seg.used = true; changed = true
        } else if (eq(cStart, sStart)) {
          chain = [...[...seg.coords].reverse().slice(0, -1), ...chain]
          seg.used = true; changed = true
        }
      }
    }
    result.push(chain)
  }

  return result
}

type LineInfo = { line: string; lineCode: string; name: string; sourceColor: string } | null

function extractLineInfo(relation: OverpassRelation, cityPrefix: string): LineInfo {
  const tags = relation.tags
  const nameKo = tags['name:ko'] ?? tags['name'] ?? ''
  const ref = tags['ref'] ?? ''
  const colour = (tags['colour'] ?? tags['color'] ?? '').trim()

  // 명칭 노선 먼저 체크 (신분당선, 경의중앙선 등)
  for (const { pattern, key, color } of NAMED_LINES) {
    if (pattern.test(nameKo) || pattern.test(ref)) {
      return { line: key, lineCode: key, name: key, sourceColor: colour || color }
    }
  }

  // 번호 노선: ref에서 숫자 추출 (예: "인천1호선" → "1", "1" → "1")
  const numericRef = ref.replace(/\D/g, '')
  const matchRef = (nameKo.match(/(\d+)\s*호선/) ?? [])[1]
  const refNum = numericRef || matchRef || ''

  if (!refNum) return null  // 식별 불가 → 건너뜀

  const fallbackColor = COLOR_FALLBACK[`${cityPrefix}${refNum}`] ?? '#888888'
  return {
    line: `${cityPrefix}${refNum}호선`,
    lineCode: refNum,
    name: `${cityPrefix} ${refNum}호선`,
    sourceColor: colour || fallbackColor,
  }
}

async function main() {
  const existing = JSON.parse(await readFile('src/data/subway-lines.json', 'utf-8')) as {
    type: string; features: Array<{ properties?: { source?: string } }>
  }

  // ninetyninenewton 역 좌표 데이터 + 이전 regional 데이터 전부 제거
  const baseFeatures = existing.features.filter(f => {
    const src = String(f.properties?.source ?? '')
    return src !== 'regional' && !src.includes('ninetyninenewton')
  })
  console.log(`기존 비지역 피처 유지: ${baseFeatures.length}개 (ninetyninenewton + regional 제거)`)

  const newFeatures: object[] = []

  for (const city of CITIES) {
    console.log(`\n[${city.key}] Overpass 쿼리 중...`)
    try {
      const raw = await queryOverpass(city.bbox)
      const filtered = city.nameFilter
        ? raw.filter(r => {
            const name = r.tags['name:ko'] ?? r.tags['name'] ?? ''
            return city.nameFilter!.test(name)
          })
        : raw
      const relations = deduplicateRelations(filtered)
      console.log(`  ${raw.length}개 발견 → 필터 ${filtered.length}개 → 중복 제거 후 ${relations.length}개`)

      for (const rel of relations) {
        const info = extractLineInfo(rel, city.prefix)
        if (!info) {
          console.warn(`  ⚠ 식별 불가: ${rel.tags['name'] ?? rel.id}`)
          continue
        }
        const { line, lineCode, name, sourceColor } = info

        const trackWays = rel.members.filter(m =>
          m.type === 'way' &&
          (m.role === '' || m.role === 'forward' || m.role === 'backward') &&
          m.geometry && m.geometry.length >= 2
        )

        if (trackWays.length === 0) {
          console.warn(`  ⚠ ${line}: 선로 way 없음`)
          continue
        }

        const stitched = stitchWays(trackWays.map(m => m.geometry!))
        const totalNodes = stitched.reduce((sum, s) => sum + s.length, 0)
        console.log(`  ✅ ${name}: ${trackWays.length}개 way → ${stitched.length}개 세그먼트, ${totalNodes}개 노드 (${sourceColor})`)

        newFeatures.push({
          type: 'Feature',
          properties: { source: 'regional', line, lineCode, name, sourceColor },
          geometry: { type: 'MultiLineString', coordinates: stitched },
        })
      }
    } catch (err) {
      console.error(`  ✗ ${city.key} 실패:`, err)
    }

    if (city !== CITIES[CITIES.length - 1]) {
      console.log('  3초 대기...')
      await sleep(3000)
    }
  }

  const output = { ...existing, features: [...baseFeatures, ...newFeatures] }
  await writeFile('src/data/subway-lines.json', JSON.stringify(output))
  console.log(`\n완료: 기존 ${baseFeatures.length}개 + 신규 ${newFeatures.length}개 = 총 ${output.features.length}개`)
}

main().catch(e => { console.error(e); process.exit(1) })
