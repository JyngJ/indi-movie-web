import { crawlShowtimeCandidates } from '../src/lib/admin/crawler'

async function testMoviee() {
  const url = 'https://wd.moviee.co.kr/Movie/Ticket'
  try {
    const candidates = await crawlShowtimeCandidates({
      source: { parser: 'movieeTicketApi', listingUrl: url } as any,
      inputKind: 'url',
      sourceUrl: url
    })
    console.log(`빙그레시네마: ${candidates.length} candidates`)
  } catch(e: any) {
    console.log(`빙그레시네마 ERROR: ${e.message}`)
  }
}

testMoviee()
