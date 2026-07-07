import { createClient } from '@supabase/supabase-js'

async function run() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const names = [
    '강서영상미디어센터', '강서 영상미디어센터',
    '씨네Q 신도림', '씨네Q 신도림점',
    '판타스틱 큐브', '판타스틱큐브',
    '쇼타임즈',
    '한국만화영상진흥원',
    '부평대한극장', '대한극장',
    '부천시민미디어센터'
  ]

  const { data: theaters } = await sb.from('theaters').select('id, name, is_closed').in('name', names)
  console.log('--- Theaters Table ---')
  console.table(theaters)

  const { data: sources } = await sb.from('crawl_sources').select('id, theater_name, parser, enabled, listing_url, health, notes').in('theater_name', names)
  console.log('\n--- Crawl Sources Table ---')
  console.table(sources)
}
run().catch(console.error)
