import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function run() {
  const { data } = await sb.from('crawl_sources').select('theater_name, parser, listing_url').in('theater_name', ['광주극장', '오오극장', '전주디지털독립영화관', '고흥작은영화관', '1939시네마'])
  console.log(data)
}
run()
