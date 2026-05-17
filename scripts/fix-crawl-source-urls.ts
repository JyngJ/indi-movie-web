import { createClient } from '@supabase/supabase-js'

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const fixes = [
    {
      id: '무비랜드-homepage',
      listing_url: 'https://movieland.co/category/Now-Showing/24/',
      notes: '상품별 옵션 파서 (카테고리 → 상품 URL 자동 추출)',
    },
    {
      id: '씨네큐브-광화문-homepage',
      listing_url: 'https://www.cinecube.co.kr/cinema/time-table',
      notes: 'HTML 테이블 파서',
    },
  ]

  for (const fix of fixes) {
    const { error } = await sb
      .from('crawl_sources')
      .update({ listing_url: fix.listing_url, notes: fix.notes })
      .eq('id', fix.id)

    if (error) console.log(`❌ ${fix.id}: ${error.message}`)
    else console.log(`✓ ${fix.id} → ${fix.listing_url}`)
  }
}
main()
