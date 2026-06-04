/**
 * Overpass API에서 지하철역 좌표 가져와 Supabase 업데이트
 * VWorld geocoding 부정확 문제 해결
 * Usage: npx tsx --env-file=.env.local scripts/fetch-overpass-subway-stations.ts [--apply]
 */
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const APPLY = process.argv.includes('--apply')
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

const CITIES = [
  { key: 'busan',   bbox: [35.0, 128.8, 35.4, 129.3] as const, cityMatch: '부산' },
  { key: 'daegu',   bbox: [35.7, 128.4, 36.1, 128.8] as const, cityMatch: '대구' },
  { key: 'gwangju', bbox: [35.0, 126.7, 35.3, 127.0] as const, cityMatch: '광주' },
  { key: 'daejeon', bbox: [36.2, 127.2, 36.5, 127.5] as const, cityMatch: '대전' },
  { key: 'incheon', bbox: [37.3, 126.4, 37.6, 126.9] as const, cityMatch: '인천' },
]

type OSMNode = {
  type: 'node'
  id: number
  lat: number
  lon: number
  tags: Record<string, string>
}

async function queryStations(bbox: readonly [number, number, number, number]): Promise<OSMNode[]> {
  const [s, w, n, e] = bbox
  // railway=station: 역사 건물/위치 노드 (stop_position보다 정확)
  const query = `[out:json][timeout:60];
node["railway"="station"](${s},${w},${n},${e});
out body;`

  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json, */*',
      'User-Agent': 'subway-station-updater/1.0',
    },
    body: `data=${encodeURIComponent(query)}`,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json() as { elements: unknown[] }
  return json.elements.filter((e): e is OSMNode =>
    typeof e === 'object' && e !== null && (e as OSMNode).type === 'node'
  )
}

// "신평역" → "신평", "부산대학교역" → "부산대학교"
function normalizeName(name: string): string {
  return name.replace(/역$/, '').trim()
}

// 엄격한 매칭: "역" suffix 차이만 허용. substring 매칭 없음 (오매칭 방지)
function nameMatches(osmName: string, dbName: string): boolean {
  const a = normalizeName(osmName)
  const b = normalizeName(dbName)
  return a === b
}

const MAX_DIST_M = 3000  // 3km 이상 오차 → 잘못된 매칭으로 간주, 스킵

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  const { data: dbStations, error } = await sb
    .from('stations')
    .select('id, name, city, lat, lng')

  if (error) throw new Error(error.message)
  console.log(`DB 역 총 ${dbStations?.length ?? 0}개\n`)

  for (const city of CITIES) {
    console.log(`[${city.key}] Overpass 쿼리...`)
    try {
      const nodes = await queryStations(city.bbox)

      // 한국어 이름 있는 노드만 + subway/지하철 계열만
      const subwayNodes = nodes.filter(n => {
        const name = n.tags['name:ko'] ?? n.tags['name'] ?? ''
        if (!/[가-힣]/.test(name)) return false
        // KTX/SRT/일반열차 제외
        const network = n.tags['network'] ?? ''
        const operator = n.tags['operator'] ?? ''
        if (/(코레일|한국철도|KORAIL|KTX|SRT)/i.test(network + operator)) return false
        return true
      })

      // 중복 제거: 같은 이름이 여러 노드 있으면 첫 번째만
      const seen = new Set<string>()
      const dedupedNodes: OSMNode[] = []
      for (const n of subwayNodes) {
        const name = normalizeName(n.tags['name:ko'] ?? n.tags['name'] ?? '')
        if (!seen.has(name)) { seen.add(name); dedupedNodes.push(n) }
      }

      console.log(`  ${nodes.length}개 발견 → 지하철 ${subwayNodes.length}개 → 중복제거 ${dedupedNodes.length}개`)

      const cityStations = (dbStations ?? []).filter(s => s.city?.includes(city.cityMatch))
      console.log(`  DB ${city.cityMatch} 역: ${cityStations.length}개`)

      let updated = 0, noMatch = 0, skippedDist = 0
      const updatedIds = new Set<string>()  // 같은 역 중복 업데이트 방지

      for (const node of dedupedNodes) {
        const osmName = node.tags['name:ko'] ?? node.tags['name'] ?? ''
        const dbStation = cityStations.find(s => nameMatches(osmName, s.name))

        if (!dbStation) {
          noMatch++
          continue
        }

        // 같은 DB 역 이미 처리했으면 스킵 (중복 매칭 방지)
        if (updatedIds.has(dbStation.id)) continue

        const latDiff = Math.abs(dbStation.lat - node.lat)
        const lngDiff = Math.abs(dbStation.lng - node.lon)
        const distM = Math.round(Math.sqrt(latDiff ** 2 + lngDiff ** 2) * 111000)

        if (distM > MAX_DIST_M) {
          console.log(`  ⛔ 스킵 (${distM}m > ${MAX_DIST_M}m): ${dbStation.name} — 잘못된 매칭 의심`)
          skippedDist++
          continue
        }

        if (distM < 5) continue  // 5m 이내 → 이미 정확

        console.log(`  📍 ${dbStation.name}: ${distM}m 오차 보정`)
        updatedIds.add(dbStation.id)

        if (APPLY) {
          const { error: err } = await sb
            .from('stations')
            .update({ lat: node.lat, lng: node.lon })
            .eq('id', dbStation.id)
          if (err) console.error(`    ❌ ${err.message}`)
        }
        updated++
      }

      console.log(`  완료: ${updated}개 업데이트, ${noMatch}개 이름 불일치, ${skippedDist}개 거리 초과 스킵\n`)
    } catch (err) {
      console.error(`  ✗ ${city.key} 실패:`, err)
    }

    if (city !== CITIES[CITIES.length - 1]) await sleep(2000)
  }

  if (!APPLY) console.log('dry-run 완료. 실제 저장: --apply 추가')
}

main().catch(e => { console.error(e); process.exit(1) })
