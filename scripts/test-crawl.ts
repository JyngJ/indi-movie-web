import { createClient } from '@supabase/supabase-js'
import { crawlShowtimeCandidates } from '../src/lib/admin/crawler'

async function main() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  
  const targetNames = [
    '광주극장',
    '1939시네마',
    '대전아트시네마',
    '인천미림극장',
    '소소아트시네마',
    '낭만극장',
    '판타스틱 큐브',
    '전주디지털독립영화관',
    '오오극장'
  ]

  const { data: sources } = await supabase.from('crawl_sources')
    .select('*')
    .in('theater_name', targetNames)

  if (!sources) return

  for (const source of sources) {
    console.log(`\nTesting ${source.theater_name} (${source.parser})`)
    try {
      const candidates = await crawlShowtimeCandidates({
        source: {
          id: source.id,
          theaterName: source.theater_name,
          parser: source.parser,
          listingUrl: source.listing_url,
          enabled: source.enabled
        } as any,
        inputKind: 'url',
        sourceUrl: source.listing_url
      })
      console.log(`Result: ${candidates.length} candidates`)
      if (candidates.length > 0) {
        console.log(`First candidate: ${candidates[0].movieTitle} at ${candidates[0].showTime}`)
      }
    } catch (e: any) {
      console.error(`Error: ${e.message}`)
    }
  }
}

main().catch(console.error)
