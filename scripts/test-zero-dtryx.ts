import { crawlShowtimeCandidates } from '../src/lib/admin/crawler'

async function testDtryx(theaterName: string, url: string) {
  try {
    const candidates = await crawlShowtimeCandidates({
      source: { parser: 'dtryxReservationApi', listingUrl: url } as any,
      inputKind: 'url',
      sourceUrl: url
    })
    console.log(`${theaterName}: ${candidates.length} candidates`)
  } catch(e: any) {
    console.log(`${theaterName} ERROR: ${e.message}`)
  }
}

async function run() {
  await testDtryx('정중앙시네마', 'https://yanggu.scinema.kr/cinema/main.do?cgid=FE8EF4D2-F22D-4802-A39A-D58F23A29C1E&BrandCd=scinema&CinemaCd=000034')
  await testDtryx('가람영화관', 'https://samcheok.scinema.kr/cinema/main.do?cgid=FE8EF4D2-F22D-4802-A39A-D58F23A29C1E&BrandCd=scinema&CinemaCd=000026')
  await testDtryx('김해문화의전당', 'https://www.dtryx.com/cinema/main.do?cgid=FE8EF4D2-F22D-4802-A39A-D58F23A29C1E&BrandCd=etc&CinemaCd=000090')
}

run()
