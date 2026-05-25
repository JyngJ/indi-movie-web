/**
 * 데이터베이스에서 중복된 극장 찾기 스크립트
 * 사용법: npm run find:duplicates
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

async function findDuplicateTheaters() {
  const supabase = createSupabaseAdminClient()

  console.log(`\n🔍 데이터베이스에서 중복된 극장을 찾고 있습니다...\n`)

  // 모든 극장 조회
  const { data: allTheaters, error: fetchError } = await supabase
    .from('theaters')
    .select('id, name, city')
    .order('name')
    .order('city')

  if (fetchError) {
    console.error('❌ 극장 조회 오류:', fetchError.message)
    process.exit(1)
  }

  if (!allTheaters || allTheaters.length === 0) {
    console.log('극장 데이터가 없습니다.')
    process.exit(0)
  }

  // 극장명 + 도시 조합으로 그룹화
  const grouped = allTheaters.reduce(
    (acc: Record<string, typeof allTheaters>, theater) => {
      const key = `${theater.name}__${theater.city}`
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(theater)
      return acc
    },
    {}
  )

  // 중복된 항목만 필터링
  const duplicates = Object.entries(grouped).filter(([, theaters]) => theaters.length > 1)

  if (duplicates.length === 0) {
    console.log('✅ 중복된 극장이 없습니다!\n')
    process.exit(0)
  }

  console.log(`⚠️  ${duplicates.length}개의 중복된 극장이 발견되었습니다:\n`)

  duplicates.forEach(([key, theaters]) => {
    const [name, city] = key.split('__')
    console.log(`📍 [${city}] ${name} — ${theaters.length}개의 레코드:`)
    theaters.forEach((theater) => {
      console.log(`  - ID: ${theater.id}`)
    })
    console.log()
  })

  console.log(`\n💡 팁: ID를 사용하여 수동으로 중복된 레코드를 삭제하세요.`)
  console.log(`   예: DELETE FROM theaters WHERE id = '<id>';\n`)
}

findDuplicateTheaters().catch((error) => {
  console.error('❌ 스크립트 실행 중 오류:', error)
  process.exit(1)
})
