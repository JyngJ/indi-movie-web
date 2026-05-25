/**
 * 천안 극장 데이터 확인
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

async function checkCheonan() {
  const supabase = createSupabaseAdminClient()

  console.log(`\n🔍 천안 지역 극장 확인\n`)

  const { data: theaters } = await supabase
    .from('theaters')
    .select('id, name, city, address, lat, lng')
    .ilike('address', '%천안%')

  if (!theaters) {
    console.log('❌ 조회 실패')
    return
  }

  console.log(`발견된 극장: ${theaters.length}개\n`)
  theaters.forEach((t) => {
    console.log(`[${t.city}] ${t.name}`)
    console.log(`  주소: ${t.address}`)
    console.log(`  좌표: ${t.lat}, ${t.lng}`)
    console.log(`  ID: ${t.id}\n`)
  })
}

checkCheonan().catch((error) => {
  console.error('❌ 오류:', error)
  process.exit(1)
})
