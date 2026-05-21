/**
 * 네이버 지오코딩 API로 극장 좌표 수정
 * 사용법: npm run geocode:theaters
 */

import * as fs from 'fs'
import * as path from 'path'

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const [, key, value] = match
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = value.trim()
      }
    }
  })
}

import { theatersToAdd } from '@/data/theaters-to-add'

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET

if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
  console.error('❌ 네이버 API 키가 없습니다.')
  process.exit(1)
}

interface GeocodingResult {
  addresses: Array<{
    x: string
    y: string
    roadAddress: string
    jibunAddress: string
  }>
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch('https://naveropenapi.apigw.naver.com/map-geocoding/v2/geocode', {
      method: 'GET',
      headers: {
        'X-NCP-APIGW-API-KEY-ID': NAVER_CLIENT_ID!,
        'X-NCP-APIGW-API-KEY': NAVER_CLIENT_SECRET!,
      },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      console.log(`  ⚠️  API 오류: ${response.status}`)
      return null
    }

    const data = (await response.json()) as GeocodingResult
    if (data.addresses && data.addresses.length > 0) {
      const { x, y } = data.addresses[0]
      return { lat: parseFloat(y), lng: parseFloat(x) }
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    if (!error.includes('timeout')) {
      console.log(`  ⚠️  오류: ${error}`)
    }
  }
  return null
}

async function geocodeTheaters() {
  console.log(`\n📍 ${theatersToAdd.length}개 극장의 좌표를 수정하고 있습니다...\n`)

  const results: typeof theatersToAdd = []
  let updatedCount = 0
  let errorCount = 0

  for (let i = 0; i < theatersToAdd.length; i++) {
    const theater = theatersToAdd[i]
    process.stdout.write(`[${i + 1}/${theatersToAdd.length}] ${theater.name}... `)

    const coords = await geocodeAddress(theater.address)

    if (coords) {
      const oldLat = theater.lat.toFixed(4)
      const oldLng = theater.lng.toFixed(4)
      const newLat = coords.lat.toFixed(4)
      const newLng = coords.lng.toFixed(4)

      // 좌표가 변경되었는지 확인
      if (oldLat !== newLat || oldLng !== newLng) {
        console.log(`✅ 수정됨 (${oldLat},${oldLng} → ${newLat},${newLng})`)
        results.push({
          ...theater,
          lat: coords.lat,
          lng: coords.lng,
        })
        updatedCount++
      } else {
        console.log(`✓ 확인됨`)
        results.push(theater)
      }
    } else {
      console.log(`⚠️  조회 불가`)
      errorCount++
      results.push(theater)
    }

    // API 레이트 제한 대응
    if ((i + 1) % 5 === 0) {
      await new Promise((r) => setTimeout(r, 100))
    }
  }

  // 결과를 파일에 저장
  const outputPath = path.resolve(process.cwd(), 'src/data/theaters-to-add.ts')
  const fileContent = `// 나무위키 예술영화관 데이터 - 좌표 추가 필요
export const theatersToAdd = [
${results.map((t) => `  {
    name: '${t.name}',
    city: '${t.city}',
    address: '${t.address}',
    lat: ${t.lat},
    lng: ${t.lng},
    phone: '${t.phone || ''}',
    website: '${t.website || ''}',${t.notes ? `
    notes: '${t.notes}',` : ''}
  },`).join('\n')}
]
`

  fs.writeFileSync(outputPath, fileContent, 'utf-8')

  console.log(`\n📊 결과:`)
  console.log(`  ✅ 수정됨: ${updatedCount}개`)
  console.log(`  ⚠️  조회 불가: ${errorCount}개`)
  console.log(`  📈 총: ${theatersToAdd.length}개\n`)
  console.log(`✨ theaters-to-add.ts가 업데이트되었습니다!\n`)
}

geocodeTheaters().catch((error) => {
  console.error('❌ 오류:', error)
  process.exit(1)
})
