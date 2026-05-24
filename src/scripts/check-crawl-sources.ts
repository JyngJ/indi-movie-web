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

async function checkSources() {
  const supabase = createSupabaseAdminClient()

  console.log('\n🔍 활성화된 크롤링 소스 확인...\n')

  const { data: enabled } = await supabase
    .from('crawl_sources')
    .select('theater_name, parser, cadence, health, listing_url')
    .eq('enabled', true)
    .order('theater_name')

  console.log(`✅ 활성화된 소스: ${enabled?.length ?? 0}개\n`)

  enabled?.forEach((source: any, idx: number) => {
    console.log(`${idx + 1}. ${source.theater_name}`)
    console.log(`   파서: ${source.parser}`)
    console.log(`   주기: ${source.cadence}`)
    console.log(`   상태: ${source.health}`)
    const url = source.listing_url?.substring(0, 50) || '(없음)'
    console.log(`   URL: ${url}${source.listing_url?.length ?? 0 > 50 ? '...' : ''}`)
    console.log('')
  })

  const { count: disabledCount } = await supabase
    .from('crawl_sources')
    .select('*', { count: 'exact', head: true })
    .eq('enabled', false)

  console.log(`⏸️  비활성화된 소스: ${disabledCount ?? 0}개\n`)
}

checkSources().catch((err) => {
  console.error('❌ 오류:', err.message)
  process.exit(1)
})
