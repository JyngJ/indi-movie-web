/**
 * 천안인생극장 city 수정: "천안" → "충남"
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

async function fixCheonanCity() {
  const supabase = createSupabaseAdminClient()

  console.log(`\n🔧 천안인생극장 city 수정 중...\n`)

  const { data, error } = await supabase
    .from('theaters')
    .update({ city: '충남' })
    .eq('name', '천안인생극장')
    .select()

  if (error) {
    console.log(`❌ 오류: ${error.message}`)
    return
  }

  if (data && data.length > 0) {
    console.log(`✅ 수정 완료`)
    console.log(`   [${data[0].city}] ${data[0].name}`)
  } else {
    console.log(`⚠️  해당 극장을 찾을 수 없습니다`)
  }

  console.log()
}

fixCheonanCity().catch((error) => {
  console.error('❌ 오류:', error)
  process.exit(1)
})
