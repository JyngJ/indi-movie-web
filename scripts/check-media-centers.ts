import { createClient } from '@supabase/supabase-js'

async function run() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: theaters } = await sb.from('theaters').select('id, name').like('name', '%미디어센터%')
  console.log('Theaters:', theaters)

  const { data: sources } = await sb.from('crawl_sources').select('theater_name, parser, listing_url, enabled').like('theater_name', '%미디어센터%')
  console.log('Sources:', sources)
}

run().catch(console.error)
