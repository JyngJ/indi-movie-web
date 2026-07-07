import { createClient } from '@supabase/supabase-js'

async function run() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const names = [
    '김해문화의전당',
    '가람영화관',
    '정중앙시네마',
    '판타스틱 큐브',
    '동광극장',
    '동두천문화극장',
    '동구영상미디어센터',
    '픽쳐하우스',
    '알프스시네마',
    '고흥작은영화관',
    '보성작은영화관',
    '빙그레시네마',
    '조이앤시네마 전주',
    'indie space',
    '동리시네마'
  ]

  const { data: sources } = await sb.from('crawl_sources')
    .select('theater_name, parser, listing_url, enabled')
    .in('theater_name', names)
    
  console.table(sources)
}

run().catch(console.error)
