import { createClient } from '@supabase/supabase-js'

async function run() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const names = [
    '강서영상미디어센터',
    '강서 영상미디어센터',
    '부천시민미디어센터',
    '한국만화영상진흥원',
    '쇼타임즈'
  ]

  const { data: sources } = await sb.from('crawl_sources').select('id').in('theater_name', names)
  if (sources && sources.length > 0) {
    const sourceIds = sources.map(s => s.id)
    await sb.from('showtime_candidates').delete().in('source_id', sourceIds)
    await sb.from('crawl_runs').delete().in('source_id', sourceIds)
  }

  // Delete from crawl_sources
  const { data: sourceData, error: sourceError } = await sb
    .from('crawl_sources')
    .delete()
    .in('theater_name', names)
    .select()
    
  if (sourceError) {
    console.error('Error deleting sources:', sourceError)
  } else {
    console.log(`Deleted ${sourceData.length} sources.`)
  }

  const { data: theaters } = await sb.from('theaters').select('id').in('name', names)
  if (theaters && theaters.length > 0) {
    const theaterIds = theaters.map(t => t.id)
    await sb.from('showtimes').delete().in('theater_id', theaterIds)
    await sb.from('screens').delete().in('theater_id', theaterIds)
  }

  // Delete from theaters
  const { data: theaterData, error: theaterError } = await sb
    .from('theaters')
    .delete()
    .in('name', names)
    .select()

  if (theaterError) {
    console.error('Error deleting theaters:', theaterError)
  } else {
    console.log(`Deleted ${theaterData.length} theaters.`)
  }
}

run().catch(console.error)
