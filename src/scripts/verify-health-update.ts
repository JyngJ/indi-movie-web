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

async function verify() {
  const supabase = createSupabaseAdminClient()

  console.log('\n📊 크롤링 소스 health 상태 확인...\n')

  // 비활성화 + unhealthy 샘플
  const { data: disabled } = await supabase
    .from('crawl_sources')
    .select('theater_name, health, enabled')
    .eq('enabled', false)
    .limit(5)

  console.log('📋 비활성화된 소스 샘플 (처음 5개):')
  disabled?.forEach((s: any) => {
    console.log(`   - ${s.theater_name}: ${s.health}`)
  })

  // 통계
  const { count: healthyCount } = await supabase
    .from('crawl_sources')
    .select('*', { count: 'exact', head: true })
    .eq('health', 'healthy')
    .eq('enabled', true)

  const { count: unhealthyCount } = await supabase
    .from('crawl_sources')
    .select('*', { count: 'exact', head: true })
    .eq('health', 'unhealthy')

  console.log(`\n📊 상태별 통계:`)
  console.log(`   ✅ healthy (활성화): ${healthyCount}개`)
  console.log(`   ❌ unhealthy (비활성화): ${unhealthyCount}개\n`)
}

verify().catch(console.error)
