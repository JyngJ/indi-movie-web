import { createClient } from '@supabase/supabase-js'

async function fetchDtryx() {
  const cgid = 'FE8EF4D2-F22D-4802-A39A-D58F23A29C1E'
  const brands = ['indieart', 'spacedog', 'seoulcc', 'cinecube', 'etc', 'scinema'] // Wait, there's scinema too
  const seen = new Set<string>()
  const dtryxTheaters: string[] = []
  
  for (const brand of brands) {
    const referer = `https://www.dtryx.com/cinema/main.do?cgid=${cgid}&BrandCd=${brand}`
    const params = new URLSearchParams({
      cgid, BrandCd: brand, CinemaCd: 'all', MovieCd: 'all', PlaySDT: 'all',
      Sort: 'boxoffice', ScreenCd: '', ShowSeq: '', TabBrandCd: brand, TabRegionCd: 'all', TabMovieType: 'all',
    })
    const res = await fetch(`https://www.dtryx.com/reserve/main_list.do?${params}`, {
      headers: { 'Referer': referer, 'X-Requested-With': 'XMLHttpRequest' },
    })
    try {
      const data = await res.json()
      for (const c of data.CinemaList ?? []) {
        if (seen.has(c.CinemaCd) || c.HiddenYn === 'Y') continue
        seen.add(c.CinemaCd)
        dtryxTheaters.push(c.CinemaNm)
      }
    } catch(e) {}
  }
  return dtryxTheaters
}

async function run() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  console.log('Fetching Dtryx theaters...')
  const dtryx = await fetchDtryx()

  console.log('Fetching DB theaters...')
  const { data: theaters } = await sb.from('theaters').select('id, name')
  const { data: sources } = await sb.from('crawl_sources').select('theater_id, parser, enabled')
  const { data: candidates } = await sb.from('showtime_candidates').select('theater_id')

  const counts = candidates?.reduce((acc, c) => {
    acc[c.theater_id] = (acc[c.theater_id] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  console.log('\n=== Theaters with 0 candidates ===')
  for (const t of theaters || []) {
    const s = sources?.find(s => s.theater_id === t.id)
    if (!s) continue // skip theaters without crawl source
    const count = counts[t.id] || 0
    if (count === 0) {
      console.log(`- ${t.name} (Parser: ${s.parser}, Enabled: ${s.enabled})`)
    }
  }

  console.log('\n=== Dtryx Theaters NOT in our DB ===')
  for (const dt of dtryx) {
    // strict includes or normalize
    const dtNorm = dt.replace(/\s+/g, '')
    const found = theaters?.some(t => t.name.replace(/\s+/g, '').includes(dtNorm) || dtNorm.includes(t.name.replace(/\s+/g, '')))
    if (!found) {
      console.log(`- ${dt}`)
    }
  }
}

run().catch(console.error)
