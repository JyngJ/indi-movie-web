import { crawlShowtimeCandidates } from './src/lib/admin/crawler'

async function run() {
  const source = {
    id: 'test',
    theaterName: '씨네Q 신도림점',
    parser: 'selfHosted',
    listingUrl: 'https://www.cineq.co.kr/Theater/Movie?TheaterCode=1001',
    enabled: true
  } as any

  try {
    console.log('Testing crawlCineQApi...')
    const candidates = await crawlShowtimeCandidates({
      source,
      inputKind: 'url',
      sourceUrl: source.listingUrl
    })
    console.log(`Found ${candidates.length} candidates.`)
  } catch (e: any) {
    console.error('Error:', e.message)
  }
}
run()
