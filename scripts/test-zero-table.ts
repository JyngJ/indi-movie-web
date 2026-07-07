import { crawlShowtimeCandidates } from '../src/lib/admin/crawler'

async function testTableText() {
  const sources = [
    { name: '알프스시네마', url: 'https://ynawc.ulju.ulsan.kr/alpscinema' },
    { name: '고흥작은영화관', url: 'https://cinema.goheung.go.kr/?pid=37' },
    { name: '동구영상미디어센터', url: 'http://www.donggumc.kr/bbs/board.php?bo_table=6_1&me_code=60' },
  ]
  
  for (const s of sources) {
    try {
      const candidates = await crawlShowtimeCandidates({
        source: { parser: 'tableText', listingUrl: s.url, theaterName: s.name } as any,
        inputKind: 'url',
        sourceUrl: s.url
      })
      console.log(`${s.name}: ${candidates.length} candidates`)
    } catch(e: any) {
      console.log(`${s.name} ERROR: ${e.message}`)
    }
  }
}

testTableText()
