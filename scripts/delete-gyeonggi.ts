import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function deleteTheater(name: string) {
  const { data: theaters } = await sb.from('theaters').select('id, name').eq('name', name)
  if (!theaters || theaters.length === 0) {
    console.log(`Not found: ${name}`)
    return
  }
  
  const id = theaters[0].id
  console.log(`Deleting ${name} (${id})`)
  
  // delete candidates
  await sb.from('showtime_candidates').delete().eq('theater_id', id)
  
  // delete source
  await sb.from('crawl_sources').delete().eq('theater_id', id)
  
  // delete theater
  await sb.from('theaters').delete().eq('id', id)
  
  console.log(`Deleted ${name}`)
}

async function run() {
  await deleteTheater('경기시청자미디어센터')
}

run().catch(console.error)
