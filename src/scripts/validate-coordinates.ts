/**
 * 극장 좌표 검증 및 이상 탐지
 * 사용법: npm run validate:coords
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

import { createSupabaseAdminClient } from '@/lib/supabase/admin'

// 한국 영토 범위
const KOREA_BOUNDS = {
  minLat: 33,
  maxLat: 43,
  minLng: 124,
  maxLng: 132,
}

async function validateCoordinates() {
  const supabase = createSupabaseAdminClient()

  console.log(`\n🔍 극장 좌표를 검증하고 있습니다...\n`)

  const { data: theaters, error } = await supabase
    .from('theaters')
    .select('id, name, city, address, lat, lng')
    .order('city')

  if (error) {
    console.error('❌ 오류:', error.message)
    process.exit(1)
  }

  if (!theaters || theaters.length === 0) {
    console.log('극장이 없습니다.')
    process.exit(0)
  }

  const invalid: typeof theaters = []
  const suspicious: typeof theaters = []

  theaters.forEach((theater) => {
    // 좌표가 한국 범위 밖인 경우
    if (
      theater.lat < KOREA_BOUNDS.minLat ||
      theater.lat > KOREA_BOUNDS.maxLat ||
      theater.lng < KOREA_BOUNDS.minLng ||
      theater.lng > KOREA_BOUNDS.maxLng
    ) {
      invalid.push(theater)
      return
    }

    // 좌표가 0이거나 너무 이상한 경우
    if (theater.lat === 0 || theater.lng === 0 || (theater.lat === 37 && theater.lng === 127)) {
      suspicious.push(theater)
    }
  })

  if (invalid.length > 0) {
    console.log(`❌ 범위를 벗어난 좌표 (${invalid.length}개):\n`)
    invalid.forEach((t) => {
      console.log(`  [${t.city}] ${t.name}`)
      console.log(`    주소: ${t.address}`)
      console.log(`    현재: ${t.lat}, ${t.lng}\n`)
    })
  }

  if (suspicious.length > 0) {
    console.log(`⚠️  의심스러운 좌표 (${suspicious.length}개):\n`)
    suspicious.forEach((t) => {
      console.log(`  [${t.city}] ${t.name}`)
      console.log(`    주소: ${t.address}`)
      console.log(`    현재: ${t.lat}, ${t.lng}\n`)
    })
  }

  const problemCount = invalid.length + suspicious.length
  if (problemCount === 0) {
    console.log('✅ 모든 좌표가 정상입니다.\n')
  } else {
    console.log(`📊 문제 있는 좌표: ${problemCount}개`)
    console.log('   수동으로 확인 후 수정이 필요합니다.\n')
  }
}

validateCoordinates().catch((error) => {
  console.error('❌ 오류:', error)
  process.exit(1)
})
