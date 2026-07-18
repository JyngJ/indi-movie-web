/**
 * 제28회 정동진독립영화제 종료 후 정리 스크립트 (add-jeongdongjin-festival.ts 페어)
 * 사용법: npx tsx scripts/remove-jeongdongjin-festival.ts
 *
 * 이벤트만 지우고 극장(정동초등학교 운동장/강릉독립예술극장 신영)은 남겨둔다 —
 * 신영은 상시 운영 극장이라 삭제 대상 아님. 정동초등학교 운동장도 향후
 * 정동진독립영화제가 매년 열리는 정기 행사장이라 재사용을 위해 유지한다.
 */
import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const [, key, value] = match
      if (!process.env[key.trim()]) process.env[key.trim()] = value.trim()
    }
  })
}

const FESTIVAL_TITLE = '제28회 정동진독립영화제'

async function run() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data, error } = await sb.from('theater_events').delete().eq('title', FESTIVAL_TITLE).select()

  if (error) {
    console.error('❌ 삭제 오류:', error.message)
    process.exit(1)
  }

  console.log(`✅ 정동진독립영화제 이벤트 ${data?.length ?? 0}개 삭제 완료`)
}

run().catch((error) => {
  console.error('❌ 스크립트 실행 중 오류:', error)
  process.exit(1)
})
