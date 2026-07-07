import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const missing = [
  { name: "목포아트시네마", cd: "000166", brand: "indieart", city: "목포" },
  { name: "영종시네마", cd: "000167", brand: "etc", city: "인천" },
  { name: "단양작은영화관", cd: "000151", brand: "scinema", city: "단양" },
  { name: "무안작은영화관", cd: "000150", brand: "scinema", city: "무안" },
  { name: "서석시네마", cd: "000157", brand: "scinema", city: "홍천" },
  { name: "설성시네마", cd: "000105", brand: "scinema", city: "음성" },
  { name: "태백작은영화관", cd: "000110", brand: "scinema", city: "태백" },
  { name: "하동영화관", cd: "000140", brand: "scinema", city: "하동" },
  { name: "화천군작은영화관", cd: "000018", brand: "scinema", city: "화천" },
  { name: "횡성시네마", cd: "000041", brand: "scinema", city: "횡성" }
]

async function geocodeKakao(query: string) {
  const res = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}`, {
    headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` }
  })
  if (!res.ok) {
    console.log('Kakao API error:', res.status, await res.text())
    return null
  }
  const data = await res.json()
  if (data.documents && data.documents.length > 0) {
    const doc = data.documents[0]
    return { address: doc.road_address_name || doc.address_name, lat: parseFloat(doc.y), lng: parseFloat(doc.x) }
  }
  return null
}

async function run() {
  for (const t of missing) {
    const geo = await geocodeKakao(t.name)
    if (!geo) {
      console.log(`Failed to geocode: ${t.name}`)
      continue
    }
    
    console.log(`Adding ${t.name} at ${geo.address} (${geo.lat}, ${geo.lng})`)
    
    const { data: inserted, error: tErr } = await sb.from('theaters').insert({
      name: t.name,
      address: geo.address,
      lat: geo.lat,
      lng: geo.lng
    }).select('id').single()
    
    if (tErr) {
      console.log(`Error inserting theater ${t.name}:`, tErr.message)
      continue
    }
    
    const cgid = 'FE8EF4D2-F22D-4802-A39A-D58F23A29C1E'
    const listingUrl = `https://www.dtryx.com/cinema/main.do?cgid=${cgid}&BrandCd=${t.brand}&CinemaCd=${t.cd}`
    
    const { error: sErr } = await sb.from('crawl_sources').insert({
      theater_id: inserted.id,
      theater_name: t.name,
      parser: 'dtryxReservationApi',
      listing_url: listingUrl,
      enabled: true
    })
    
    if (sErr) {
      console.log(`Error inserting source for ${t.name}:`, sErr.message)
    } else {
      console.log(`Successfully added ${t.name}`)
    }
  }
}

run().catch(console.error)
