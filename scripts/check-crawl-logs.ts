import { createClient } from '@supabase/supabase-js'

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data } = await sb
    .from('crawl_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(20)

  for (const r of data ?? []) {
    const icon = r.status === 'failed' ? '❌' : '✓'
    console.log(`${icon} ${r.source_name} | ${r.error ?? ''}`)
  }
}
main()
