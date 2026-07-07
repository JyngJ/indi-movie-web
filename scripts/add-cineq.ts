import { createClient } from '@supabase/supabase-js'

async function run() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const theaterName = '씨네Q 신도림점'

  const { data: theaters } = await sb.from('theaters').select('id, name').eq('name', theaterName)
  
  let theaterId = ''
  if (!theaters || theaters.length === 0) {
    const { data: newTheater, error: err } = await sb.from('theaters').insert({
      name: theaterName,
      address: '서울시 구로구 새말로 97, 신도림 테크노마트 12층',
      city: '서울특별시',
      lat: 37.507,
      lng: 126.889,
      screen_count: 5
    }).select()
    
    if (err) {
      console.error(err)
      return
    }
    theaterId = newTheater[0].id
    console.log('Inserted theater:', theaterId)
  } else {
    theaterId = theaters[0].id
    console.log('Found theater:', theaterId)
  }

  const { error: sourceErr } = await sb.from('crawl_sources').insert({
    id: crypto.randomUUID(),
    theater_name: theaterName,
    theater_id: theaterId,
    parser: 'selfHosted',
    listing_url: 'https://www.cineq.co.kr/Theater/Movie?TheaterCode=1001',
    enabled: true,
    cadence: 'daily',
    notes: '씨네Q 공식 API 사용'
  })

  if (sourceErr) {
    console.error('Source error:', sourceErr)
  } else {
    console.log('Inserted crawl_sources for CineQ')
  }
}

run().catch(console.error)
