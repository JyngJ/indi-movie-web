import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())
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
    .eq('status', 'failed')
    .order('started_at', { ascending: false })
    .limit(20)
  for (const r of data ?? []) {
    console.log(`❌ ${r.source_name} | ${r.error ?? ''} | ${r.started_at}`)
  }
}
main()
