import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function run() {
  const { data } = await sb.from('crawl_sources').select('id, theater_name, parser, enabled, health').eq('health', 'unhealthy').eq('enabled', true)
  console.log(data)
}
run()
