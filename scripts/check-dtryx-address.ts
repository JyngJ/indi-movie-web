async function run() {
  const cgid = 'FE8EF4D2-F22D-4802-A39A-D58F23A29C1E'
  const brand = 'scinema' // most small theaters are here
  const params = new URLSearchParams({
    cgid, BrandCd: brand, CinemaCd: 'all', MovieCd: 'all', PlaySDT: 'all',
    Sort: 'boxoffice', ScreenCd: '', ShowSeq: '', TabBrandCd: brand, TabRegionCd: 'all', TabMovieType: 'all',
  })
  const res = await fetch(`https://www.dtryx.com/reserve/main_list.do?${params}`, {
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  })
  const data = await res.json()
  console.log(data.CinemaList[0])
}
run()
