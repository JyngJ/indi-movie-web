import { createClient } from '@supabase/supabase-js'

async function fetchDtryx() {
  const cgid = 'FE8EF4D2-F22D-4802-A39A-D58F23A29C1E'
  const brands = ['indieart', 'spacedog', 'seoulcc', 'cinecube', 'etc', 'scinema']
  const seen = new Set<string>()
  const theaters: Array<{ name: string, cd: string, brand: string }> = []
  
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
        theaters.push({ name: c.CinemaNm, cd: c.CinemaCd, brand })
      }
    } catch(e) {}
  }
  return theaters
}

async function run() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const dtryx = await fetchDtryx()
  const { data: dbTheaters } = await sb.from('theaters').select('id, name')

  const missing = dtryx.filter(dt => {
    const dtNorm = dt.name.replace(/\s+/g, '')
    return !dbTheaters?.some(t => t.name.replace(/\s+/g, '').includes(dtNorm) || dtNorm.includes(t.name.replace(/\s+/g, '')))
  })

  console.log(JSON.stringify(missing, null, 2))
}

run().catch(console.error)
