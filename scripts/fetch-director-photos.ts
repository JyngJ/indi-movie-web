/**
 * Wikipedia API로 감독 프로필 사진 채우기
 * directors 테이블에 photo_url 컬럼이 있다고 가정.
 * 없으면 movies.director 배열에서 고유 감독명 추출 후 콘솔 출력만.
 *
 * dry-run:  npx tsx --env-file=.env.local scripts/fetch-director-photos.ts
 * 적용:     npx tsx --env-file=.env.local scripts/fetch-director-photos.ts --apply
 */
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

const WIKI_API = 'https://ko.wikipedia.org/w/api.php'
const WIKI_API_EN = 'https://en.wikipedia.org/w/api.php'

async function fetchWikiPhoto(name: string): Promise<string | null> {
  // 한국어 위키 먼저
  for (const [api, query] of [
    [WIKI_API, name],
    [WIKI_API_EN, name],
  ] as [string, string][]) {
    const url = new URL(api)
    url.searchParams.set('action', 'query')
    url.searchParams.set('titles', query)
    url.searchParams.set('prop', 'pageimages')
    url.searchParams.set('pithumbsize', '400')
    url.searchParams.set('format', 'json')
    url.searchParams.set('origin', '*')

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'indi-movie-web/0.1 (mailto:mail.jaeyong@gmail.com)' },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) continue

    const data = await res.json() as {
      query?: { pages?: Record<string, { thumbnail?: { source: string }; missing?: string }> }
    }
    const pages = Object.values(data?.query?.pages ?? {})
    const thumb = pages[0]?.thumbnail?.source
    if (thumb && !pages[0]?.missing) return thumb
    await new Promise(r => setTimeout(r, 150))
  }
  return null
}

async function main() {
  const apply = process.argv.includes('--apply')
  if (!apply) console.log('🔍 dry-run (--apply 로 실제 저장)\n')

  // 현재 상영 중 영화들의 감독 목록
  const { data: movies, error } = await sb
    .from('movies')
    .select('director')
  if (error) { console.error(error.message); process.exit(1) }

  const directors = Array.from(
    new Set((movies ?? []).flatMap((m: { director: string[] }) => m.director).filter(Boolean))
  ).sort()

  console.log(`고유 감독 ${directors.length}명 검색\n`)

  const found: { name: string; url: string }[] = []
  const missing: string[] = []

  for (const name of directors) {
    process.stdout.write(`  ${name} ... `)
    try {
      const url = await fetchWikiPhoto(name)
      if (url) {
        console.log(url)
        found.push({ name, url })
      } else {
        console.log('없음')
        missing.push(name)
      }
    } catch (e) {
      console.log(`에러: ${(e as Error).message}`)
      missing.push(name)
    }
    await new Promise(r => setTimeout(r, 200))
  }

  console.log(`\n결과: 찾음 ${found.length} / 없음 ${missing.length}`)
  if (missing.length) console.log('\n없음:', missing.join(', '))
}

main().catch(console.error)
