import { createClient } from '@supabase/supabase-js'

async function main() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // 최근 크롤 런 확인
  const { data: runs } = await supabase.from('crawl_runs')
    .select('source_name, status, created_count, error, started_at')
    .order('started_at', { ascending: false })
    .limit(5)
  console.log('=== 최근 크롤 런 ===')
  console.log(JSON.stringify(runs, null, 2))

  // enabled 소스 수
  const { count: enabledCount } = await supabase.from('crawl_sources')
    .select('id', { count: 'exact', head: true })
    .eq('enabled', true)
  console.log('\n활성 소스 수:', enabledCount)

  // unhealthy 소스
  const { data: unhealthy } = await supabase.from('crawl_sources')
    .select('id, theater_name, health, listing_url')
    .eq('health', 'unhealthy')
    .eq('enabled', true)
  console.log('\nunhealthy 소스:', JSON.stringify(unhealthy, null, 2))
}

main()
