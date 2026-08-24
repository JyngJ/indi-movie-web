import { searchKmdbMovies } from '../src/lib/admin/kmdb'
import { candidateMovieTitleCandidates } from '../src/lib/admin/store'
async function main() {
  for (const q of ['위커 맨: 파이널 컷', '애정만세', '호프', '델마', '지난 여름', '수련']) {
    const titles = candidateMovieTitleCandidates(q)
    console.log('\n==', q, '| variants:', JSON.stringify(titles))
    try {
      const r = await searchKmdbMovies(titles[0])
      console.log(r.slice(0,5).map(m => `${m.title} (${m.year}) ${m.director?.join(',')}`).join(' | ') || '(없음)')
    } catch (e) { console.log('ERR', (e as Error).message) }
  }
}
main()
