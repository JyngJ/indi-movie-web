import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function run() {
  const { data } = await sb.from('crawl_sources').select('theater_name, parser, listing_url').eq('theater_name', '정남진시네마')
  console.log(data)
}
run()
