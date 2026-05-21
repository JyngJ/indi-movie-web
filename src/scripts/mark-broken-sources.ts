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

async function markBrokenSources() {
  const supabase = createSupabaseAdminClient()

  console.log('\n🔧 비활성화된 크롤링 소스의 상태를 unhealthy로 변경합니다...\n')

  const { data: disabled, error: fetchError } = await supabase
    .from('crawl_sources')
    .select('id, theater_name')
    .eq('enabled', false)

  if (fetchError) {
    console.log('❌ 오류:', fetchError.message)
    return
  }

  console.log(`📝 변경 대상: ${disabled?.length ?? 0}개\n`)

  const { error: updateError } = await supabase
    .from('crawl_sources')
    .update({ health: 'unhealthy' })
    .eq('enabled', false)

  if (updateError) {
    console.log('❌ 업데이트 오류:', updateError.message)
    return
  }

  console.log(`✅ 완료!`)
  console.log(`   비활성화된 모든 소스의 health를 'unhealthy'로 설정했습니다.\n`)

  // 결과 확인
  const { data: healthyCount } = await supabase
    .from('crawl_sources')
    .select('*', { count: 'exact', head: true })
    .eq('health', 'healthy')

  const { data: unhealthyCount } = await supabase
    .from('crawl_sources')
    .select('*', { count: 'exact', head: true })
    .eq('health', 'unhealthy')

  console.log(`📊 상태 통계:`)
  console.log(`   ✅ healthy: ${healthyCount?.length ?? 0}개`)
  console.log(`   ❌ unhealthy: ${unhealthyCount?.length ?? 0}개\n`)
}

markBrokenSources().catch((error) => {
  console.error('❌ 스크립트 실행 중 오류:', error)
  process.exit(1)
})
