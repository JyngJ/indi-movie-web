/**
 * 부산/대구/광주/대전 지하철 노선 GeoJSON 생성
 * DB의 역 좌표를 순서대로 연결해서 MultiLineString 생성
 * Usage: npx tsx --env-file=.env.local scripts/build-regional-subway-lines.ts
 */
import { createClient } from '@supabase/supabase-js'
import { readFile, writeFile } from 'node:fs/promises'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const LINE_CONFIG: Record<string, { color: string; name: string; order: string[] }> = {
  '부산1호선': {
    color: '#F37021', name: '부산 1호선',
    order: ['신평','당리','하단','괴정','대티','서대신','동대신','토성','자갈치','남포','중앙','부산역','초량','부산진','좌천','범일','범내골','서면','부전','양정','시청','연산','교대','동래','명륜','온천장','부산대','장전','구서','두실','남산','범어사','노포'],
  },
  '부산2호선': {
    color: '#00A650', name: '부산 2호선',
    order: ['장산','해운대','센텀시티','수영','광안','금련산','남천','경성대·부경대','대연','못골','문현','전포','부암','가야','주례','사상','모덕','덕포','감전','냉정','호포','증산','양산'],
  },
  '대구1호선': {
    color: '#D93F5B', name: '대구 1호선',
    order: ['설화명곡','용산','계명대','대곡','진천','월배','상인','월성','대명','현충로','영대병원','반월당','중앙로','대구역','칠성시장','동천','동구청','아양교','동촌','해안','방촌','각산','안심'],
  },
  '대구2호선': {
    color: '#00A8E0', name: '대구 2호선',
    order: ['문양','다사','이곡','용산(대구)','죽전','감삼','두류','내당','반고개','청라언덕','경대병원','대구은행','범어','수성구청','만촌','담티','고산','신매','사월','임당','영남대'],
  },
  '광주1호선': {
    color: '#00A650', name: '광주 1호선',
    order: ['녹동','소태','운림','남광주','문화전당','금남로4가','금남로5가','양동시장','농성','화정','쌍촌','운천','상무','김대중컨벤션센터','공항','광주송정','도산','평동','박호'],
  },
  '대전1호선': {
    color: '#00A8E0', name: '대전 1호선',
    order: ['반석','지족','노은','월평','갈마','정부청사','시청','중구청','서대전네거리','오룡','용문','탄방','대전역','중앙로','대동','신흥','판암'],
  },
}

async function main() {
  // DB에서 모든 역 좌표 가져오기
  const { data: stationsData } = await sb
    .from('stations')
    .select('name, lines, lat, lng')
    .order('name')

  const stationMap = new Map<string, { lat: number; lng: number }>()
  for (const s of stationsData ?? []) {
    stationMap.set(s.name, { lat: s.lat, lng: s.lng })
  }

  // 기존 subway-lines.json 읽기
  const existing = JSON.parse(await readFile('src/data/subway-lines.json', 'utf-8')) as {
    type: string; features: object[]
  }

  const newFeatures: object[] = []

  for (const [lineKey, config] of Object.entries(LINE_CONFIG)) {
    const coords: [number, number][] = []
    let missing = 0
    for (const stName of config.order) {
      const st = stationMap.get(stName)
      if (st) {
        coords.push([st.lng, st.lat])
      } else {
        console.warn(`  역 좌표 없음: ${stName} (${lineKey})`)
        missing++
      }
    }
    if (coords.length < 2) {
      console.warn(`  ${lineKey}: 좌표 부족 (${coords.length}개)`)
      continue
    }

    console.log(`  ✅ ${config.name}: ${coords.length}개 좌표 (누락 ${missing})`)
    newFeatures.push({
      type: 'Feature',
      properties: {
        source: 'regional',
        line: lineKey,
        lineCode: lineKey.replace(/[가-힣]/g, '').toLowerCase(),
        name: config.name,
        sourceColor: config.color,
      },
      geometry: {
        type: 'MultiLineString',
        coordinates: [coords],
      },
    })
  }

  const output = {
    ...existing,
    features: [...existing.features, ...newFeatures],
  }

  await writeFile('src/data/subway-lines.json', JSON.stringify(output, null, 2))
  console.log(`\n완료: 기존 ${existing.features.length}개 + 신규 ${newFeatures.length}개 = 총 ${output.features.length}개 노선`)
}

main().catch(e => { console.error(e); process.exit(1) })
