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

async function findDuplicates() {
  const supabase = createSupabaseAdminClient()

  const { data: theaters } = await supabase
    .from('theaters')
    .select('id, name, city, address')

  if (!theaters) {
    console.log('❌ 조회 실패')
    return
  }

  console.log(`\n🔍 중복/유사 극장명 검색 (총 ${theaters.length}개)\n`)

  // 씨네아트 관련
  const cinemaArt = theaters.filter(t => t.name.includes('씨네아트'))
  console.log(`씨네아트 관련 (${cinemaArt.length}개):`)
  cinemaArt.forEach(t => console.log(`  - ${t.name} (${t.city})`))

  // 밀양 관련
  const miryang = theaters.filter(t => t.name.includes('밀양'))
  console.log(`\n밀양 관련 (${miryang.length}개):`)
  miryang.forEach(t => console.log(`  - ${t.name} (${t.city})`))

  // 공백 차이 찾기
  const nameMap = new Map<string, typeof theaters>()
  for (const t of theaters) {
    const normalized = t.name.replace(/\s/g, '')
    if (!nameMap.has(normalized)) nameMap.set(normalized, [])
    nameMap.get(normalized)!.push(t)
  }

  console.log(`\n공백으로만 다른 극장명:`)
  for (const [, group] of nameMap) {
    if (group.length > 1) {
      console.log(`\n  "${group[0].name}" 변형들:`)
      group.forEach(t => console.log(`    - ${t.name} (${t.city}) ID: ${t.id}`))
    }
  }
}

findDuplicates().catch((error) => {
  console.error('❌ 오류:', error)
  process.exit(1)
})
