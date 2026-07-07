import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const missing = [
  { name: "목포아트시네마", cd: "000166", brand: "indieart", address: "전라남도 목포시 영산로59번길 30" },
  { name: "영종시네마", cd: "000167", brand: "etc", address: "인천광역시 중구 영종대로 184" },
  { name: "단양작은영화관", cd: "000151", brand: "scinema", address: "충청북도 단양군 단양읍 군청로 85" },
  { name: "무안작은영화관", cd: "000150", brand: "scinema", address: "전라남도 무안군 무안읍 면성1길 130" },
  { name: "서석시네마", cd: "000157", brand: "scinema", address: "강원특별자치도 홍천군 서석면 구룡령로 2512" },
  { name: "설성시네마", cd: "000105", brand: "scinema", address: "충청북도 음성군 음성읍 수정로 37" },
  { name: "태백작은영화관", cd: "000110", brand: "scinema", address: "강원특별자치도 태백시 장성1길 175-1" },
  { name: "하동영화관", cd: "000140", brand: "scinema", address: "경상남도 하동군 하동읍 시장1길 17" },
  { name: "화천군작은영화관", cd: "000018", brand: "scinema", address: "강원특별자치도 화천군 화천읍 상승로2길 25-10" },
  { name: "횡성시네마 ", cd: "000041", brand: "scinema", address: "강원특별자치도 횡성군 횡성읍 앞들서3로 6" }
]

async function geocodeVworld(address: string) {
  for (const type of ['ROAD', 'PARCEL'] as const) {
    const url = new URL('https://api.vworld.kr/req/address')
    url.searchParams.set('service', 'address')
    url.searchParams.set('request', 'getCoord')
    url.searchParams.set('key', process.env.V_WORLD_KEY!)
    url.searchParams.set('address', address)
    url.searchParams.set('type', type)
    url.searchParams.set('format', 'json')
    try {
      const res = await fetch(url.toString())
      const data = await res.json()
      const pt = data.response?.result?.point
      if (data.response?.status === 'OK' && pt?.x && pt?.y) {
        return { lat: parseFloat(pt.y), lng: parseFloat(pt.x) }
      }
    } catch {}
  }
  return null
}

async function run() {
  for (const t of missing) {
    const geo = await geocodeVworld(t.address)
    if (!geo) {
      console.log(`Failed to geocode: ${t.name} (${t.address})`)
      continue
    }
    
    console.log(`Adding ${t.name} at ${t.address} (${geo.lat}, ${geo.lng})`)
    
    let theaterId: string
    const { data: existing } = await sb.from('theaters').select('id').eq('name', t.name.trim())
    if (existing && existing.length > 0) {
      console.log(`Theater already exists: ${t.name}`)
      theaterId = existing[0].id
    } else {
      const { data: inserted, error: tErr } = await sb.from('theaters').insert({
        name: t.name.trim(),
        address: t.address,
        lat: geo.lat,
        lng: geo.lng
      }).select('id').single()
      
      if (tErr || !inserted) {
        console.log(`Error inserting theater ${t.name}:`, tErr?.message)
        continue
      }
      theaterId = inserted.id
    }
    
    // check if source already exists
    const { data: existingSource } = await sb.from('crawl_sources').select('id').eq('theater_id', theaterId)
    if (existingSource && existingSource.length > 0) {
      console.log(`Source already exists for: ${t.name}`)
      continue
    }
    
    const cgid = 'FE8EF4D2-F22D-4802-A39A-D58F23A29C1E'
    const listingUrl = `https://www.dtryx.com/cinema/main.do?cgid=${cgid}&BrandCd=${t.brand}&CinemaCd=${t.cd}`
    
    const { error: sErr } = await sb.from('crawl_sources').insert({
      id: randomUUID(),
      theater_id: theaterId,
      theater_name: t.name.trim(),
      parser: 'dtryxReservationApi',
      listing_url: listingUrl,
      cadence: 'manual',
      enabled: true
    })
    
    if (sErr) {
      console.log(`Error inserting source for ${t.name}:`, sErr.message)
    } else {
      console.log(`Successfully added ${t.name} and its source.`)
    }
  }
}

run().catch(console.error)
