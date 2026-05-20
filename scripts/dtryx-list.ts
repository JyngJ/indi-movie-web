async function main() {
  const cgid = 'FE8EF4D2-F22D-4802-A39A-D58F23A29C1E'
  const brands = ['indieart', 'spacedog', 'seoulcc', 'cinecube', 'etc']
  const seen = new Set<string>()
  
  for (const brand of brands) {
    const referer = `https://www.dtryx.com/cinema/main.do?cgid=${cgid}&BrandCd=${brand}`
    const params = new URLSearchParams({
      cgid, BrandCd: brand, CinemaCd: 'all', MovieCd: 'all', PlaySDT: 'all',
      Sort: 'boxoffice', ScreenCd: '', ShowSeq: '', TabBrandCd: brand, TabRegionCd: 'all', TabMovieType: 'all',
    })
    const res = await fetch(`https://www.dtryx.com/reserve/main_list.do?${params}`, {
      headers: { 'Referer': referer, 'X-Requested-With': 'XMLHttpRequest' },
    })
    const data = await res.json() as { CinemaList?: Array<{ CinemaCd: string; CinemaNm: string; RegionNm: string; HiddenYn: string }> }
    for (const c of data.CinemaList ?? []) {
      if (seen.has(c.CinemaCd) || c.HiddenYn === 'Y') continue
      seen.add(c.CinemaCd)
      console.log(`${c.CinemaCd}\t${brand.padEnd(12)}\t${c.RegionNm.padEnd(6)}\t${c.CinemaNm}`)
    }
  }
}
main().catch(console.error)
