import { crawlShowtimeCandidates } from './src/lib/admin/crawler'

async function run() {
  const source = {
    id: 'dee59f86-63c2-436c-a5e5-63aa7cfeb7bc',
    theaterName: '판타스틱 큐브',
    parser: 'dtryxReservationApi',
    listingUrl: 'https://www.dtryx.com/cinema/main.do?cgid=FE8EF4D2-F22D-4802-A39A-D58F23A29C1E&BrandCd=indieart&CinemaCd=000056',
    enabled: true
  } as any

  try {
    console.log('Fetching 판타스틱 큐브 candidates...')
    const candidates = await crawlShowtimeCandidates({
      source,
      inputKind: 'url',
      sourceUrl: source.listingUrl
    })
    console.log(`Found ${candidates.length} candidates.`)
    if (candidates.length > 0) {
      console.log(candidates[0])
    }
  } catch (e: any) {
    console.error('Error:', e.message)
  }
}
run()
