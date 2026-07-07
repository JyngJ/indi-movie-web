import { createClient } from '@supabase/supabase-js'

async function run() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: theaters } = await sb.from('theaters').select('id, name, address').like('address', '%제주%')
  
  if (!theaters || theaters.length === 0) {
    console.log('No theaters found in Jeju.')
    return
  }
  
  console.log(`Found ${theaters.length} theaters in Jeju:`)
  const ids = theaters.map(t => t.id)
  
  const { data: sources } = await sb.from('crawl_sources').select('theater_id, parser, listing_url, enabled').in('theater_id', ids)
  
  const { data: candidates } = await sb.from('showtime_candidates').select('theater_id').in('theater_id', ids)
  const candidateCounts = candidates?.reduce((acc, c) => {
    acc[c.theater_id] = (acc[c.theater_id] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}
  
  for (const t of theaters) {
    const source = sources?.find(s => s.theater_id === t.id)
    const count = candidateCounts[t.id] || 0
    console.log(`- ${t.name}`)
    console.log(`  Address: ${t.address}`)
    console.log(`  Parser: ${source?.parser || 'NONE'}, Enabled: ${source?.enabled}, Candidates: ${count}`)
  }
}

run().catch(console.error)
