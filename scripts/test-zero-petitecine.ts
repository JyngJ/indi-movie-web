import { crawlShowtimeCandidates } from '../src/lib/admin/crawler'

async function testPetite(theaterName: string, url: string) {
  try {
    const candidates = await crawlShowtimeCandidates({
      source: { parser: 'petitecine', listingUrl: url } as any,
      inputKind: 'url',
      sourceUrl: url
    })
    console.log(`${theaterName}: ${candidates.length} candidates`)
  } catch(e: any) {
    console.log(`${theaterName} ERROR: ${e.message}`)
  }
}

async function run() {
  await testPetite('동두천문화극장', 'https://petitecine.com/PETC/ticketing?cinema_id=75')
  await testPetite('동광극장', 'https://petitecine.com/PETC/ticketing?cinema_id=80')
  await testPetite('보성작은영화관', 'https://petitecine.com/PETC/ticketing?cinema_id=67')
}

run()
