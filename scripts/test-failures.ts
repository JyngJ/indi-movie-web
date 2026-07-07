import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function run() {
  const { data } = await sb.from('crawl_runs')
    .select('source_name, status, created_count, error, started_at')
    .order('started_at', { ascending: false })
    .limit(100)

  const fails = data?.filter(r => r.status === 'failed' || r.created_count === 0) || []
  
  const grouped = fails.reduce((acc, r) => {
    acc[r.source_name] = acc[r.source_name] || { status: r.status, err: r.error, count: 0, zero: 0 }
    acc[r.source_name].count++
    if (r.created_count === 0 && r.status !== 'failed') acc[r.source_name].zero++
    acc[r.source_name].last_err = r.error
    return acc
  }, {} as any)
  
  console.log('Failed or 0 count in last 100 runs:')
  console.table(grouped)
}
run()
