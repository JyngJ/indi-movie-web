/**
 * 극장 데이터 시드 스크립트
 * 사용법: npm run seed:theaters
 */

import * as fs from 'fs'
import * as path from 'path'

// .env.local 파일 로드
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
import { theatersToAdd } from '@/data/theaters-to-add'

async function seedTheaters() {
  const supabase = createSupabaseAdminClient()

  console.log(`\n📍 극장 ${theatersToAdd.length}개를 DB에 추가합니다...\n`)

  let successCount = 0
  let skipCount = 0
  let errorCount = 0

  for (const theater of theatersToAdd) {
    try {
      // 중복 체크: 극장명 + 도시 조합으로 확인
      const { data: existing } = await supabase
        .from('theaters')
        .select('id, name, city')
        .eq('name', theater.name)
        .eq('city', theater.city)
        .single()

      if (existing) {
        console.log(`⏭️  [${theater.city}] ${theater.name} — 이미 존재합니다.`)
        skipCount++
        continue
      }

      // 극장 추가
      const { data, error } = await supabase
        .from('theaters')
        .insert({
          name: theater.name,
          lat: theater.lat,
          lng: theater.lng,
          address: theater.address,
          city: theater.city,
          phone: theater.phone || null,
          website: theater.website || null,
          instagram_url: '',
          screen_count: 0,
          seat_count: null,
        })
        .select('id')
        .single()

      if (error) {
        console.log(`❌ [${theater.city}] ${theater.name} — 오류: ${error.message}`)
        errorCount++
        continue
      }

      if (data) {
        console.log(`✅ [${theater.city}] ${theater.name}`)
        successCount++
      }
    } catch (err) {
      console.log(`❌ [${theater.city}] ${theater.name} — 예외: ${err instanceof Error ? err.message : String(err)}`)
      errorCount++
    }
  }

  console.log(`\n📊 결과:`)
  console.log(`  ✅ 추가됨: ${successCount}개`)
  console.log(`  ⏭️  이미 존재: ${skipCount}개`)
  console.log(`  ❌ 오류: ${errorCount}개`)
  console.log(`  📈 총: ${theatersToAdd.length}개\n`)

  if (successCount > 0) {
    console.log('✨ 극장 데이터 추가 완료! 어드민 콘솔을 새로고침하면 반영됩니다.\n')
  }
}

seedTheaters().catch((error) => {
  console.error('❌ 시드 스크립트 실행 중 오류:', error)
  process.exit(1)
})
