/**
 * 포스터 없는 영화를 TMDB에서 검색해 poster_url 채우기
 *
 * 사전 조건: .env.local에 TMDB_API_KEY 추가
 *   TMDB_API_KEY=eyJhbGci...  (Bearer token) 또는 v3 API key
 *
 * 실행 (dry-run):  npx tsx --env-file=.env.local scripts/fill-poster-tmdb.ts
 * 실행 (적용):     npx tsx --env-file=.env.local scripts/fill-poster-tmdb.ts --apply
 */
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

const TMDB_KEY = process.env.TMDB_API_KEY
const POSTER_BASE = 'https://image.tmdb.org/t/p/w500'

async function searchTmdb(title: string, year: number): Promise<string | null> {
  if (!TMDB_KEY) throw new Error('TMDB_API_KEY 환경변수가 없습니다')

  // v3 key vs Bearer token 자동 판별
  const isBearer = TMDB_KEY.length > 50
  const headers: Record<string, string> = isBearer
    ? { Authorization: `Bearer ${TMDB_KEY}` }
    : {}

  const url = new URL('https://api.themoviedb.org/3/search/movie')
  url.searchParams.set('query', title)
  url.searchParams.set('year', String(year))
  url.searchParams.set('language', 'ko-KR')
  url.searchParams.set('include_adult', 'false')
  if (!isBearer) url.searchParams.set('api_key', TMDB_KEY)

  const res = await fetch(url, { headers })
  if (!res.ok) {
    console.error(`  TMDB HTTP ${res.status}`)
    return null
  }
  const json = await res.json() as { results?: Array<{ poster_path?: string; title?: string; release_date?: string }> }
  const results = json.results ?? []

  // 연도가 ±1 이내인 결과 중 포스터 있는 첫 번째
  const hit = results.find(r => {
    if (!r.poster_path) return false
    const releaseYear = parseInt(r.release_date?.slice(0, 4) ?? '0')
    return Math.abs(releaseYear - year) <= 1
  }) ?? results.find(r => r.poster_path)  // 연도 무관 폴백

  if (!hit?.poster_path) return null
  return POSTER_BASE + hit.poster_path
}

async function main() {
  if (!TMDB_KEY) {
    console.error('❌ TMDB_API_KEY 환경변수가 없습니다.')
    console.error('   .env.local에 아래 줄 추가 후 재실행:')
    console.error('   TMDB_API_KEY=<your_key>')
    process.exit(1)
  }

  const apply = process.argv.includes('--apply')
  if (!apply) console.log('🔍 dry-run 모드 (실제 적용하려면 --apply 추가)\n')

  const { data: movies } = await sb.from('movies')
    .select('id, title, year')
    .is('poster_url', null)
    .order('title')

  const targets = movies ?? []
  console.log(`포스터 없는 영화: ${targets.length}개\n`)

  for (const m of targets) {
    process.stdout.write(`${m.title} (${m.year}) ... `)
    try {
      const posterUrl = await searchTmdb(m.title, m.year)
      if (!posterUrl) {
        console.log('없음')
        continue
      }
      console.log(posterUrl)
      if (apply) {
        const { error } = await sb.from('movies').update({ poster_url: posterUrl }).eq('id', m.id)
        if (error) console.error(`  ❌ 업데이트 실패: ${error.message}`)
        else console.log(`  ✅ 저장 완료`)
      }
    } catch (e) {
      console.log(`오류: ${(e as Error).message}`)
    }
    await new Promise(r => setTimeout(r, 250)) // rate limit
  }
}

main().catch(console.error)
