import { createClient } from '@supabase/supabase-js'

async function run() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: theaters } = await sb.from('theaters').select('id, name, address').like('address', '%제주%')
  const ids = theaters?.map(t => t.id) || []
  
  const { data: sources } = await sb.from('crawl_sources').select('theater_name, listing_url').in('theater_id', ids)
  
  console.log(sources)
}
run().catch(console.error)
