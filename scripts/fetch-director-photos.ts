/**
 * Wikipedia API로 감독 프로필 사진 채우기
 * directors 테이블에서 photo_url이 없는 감독만 대상.
 * directors 테이블에 없는 감독은 movies.director[]에서 수집해 upsert.
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

const WIKI_KO = 'https://ko.wikipedia.org/w/api.php'
const WIKI_EN = 'https://en.wikipedia.org/w/api.php'

async function fetchWikiPhoto(name: string): Promise<string | null> {
  for (const [api, query] of [
    [WIKI_KO, name],
    [WIKI_EN, name],
  ] as [string, string][]) {
    const url = new URL(api)
    url.searchParams.set('action', 'query')
    url.searchParams.set('titles', query)
    url.searchParams.set('prop', 'pageimages')
    url.searchParams.set('pithumbsize', '400')
    url.searchParams.set('format', 'json')
    url.searchParams.set('origin', '*')

    try {
      const res = await fetch(url.toString(), {
        headers: { 'User-Agent': 'indi-movie-web/0.1 (mailto:mail.jaeyong@gmail.com)' },
        signal: AbortSignal.timeout(6000),
      })
      if (!res.ok) continue
      const data = await res.json() as {
        query?: { pages?: Record<string, { thumbnail?: { source: string }; missing?: string }> }
      }
      const pages = Object.values(data?.query?.pages ?? {})
      const page = pages[0]
      if (page && !('missing' in page) && page.thumbnail?.source) return page.thumbnail.source
    } catch {
      // timeout or network error — try next wiki
    }
    await new Promise(r => setTimeout(r, 150))
  }
  return null
}

async function main() {
  const apply = process.argv.includes('--apply')
  if (!apply) console.log('🔍 dry-run (--apply 로 실제 저장)\n')

  // 1. movies 테이블에서 모든 고유 감독 수집
  const { data: movies, error: mErr } = await sb.from('movies').select('director')
  if (mErr) { console.error(mErr.message); process.exit(1) }

  const allNames = Array.from(
    new Set((movies ?? []).flatMap((m: { director: string[] }) => m.director ?? []).filter(Boolean))
  ).sort()
  console.log(`movies 테이블 고유 감독: ${allNames.length}명`)

  // 2. directors 테이블에서 기존 데이터 조회
  const { data: existing, error: dErr } = await sb.from('directors').select('name, photo_url')
  if (dErr) { console.error(dErr.message); process.exit(1) }

  const existingMap = new Map((existing ?? []).map((r: { name: string; photo_url: string | null }) => [r.name, r.photo_url]))
  console.log(`directors 테이블 기존: ${existingMap.size}명`)

  // 3. photo_url 없는 감독만 처리
  const targets = allNames.filter(n => !existingMap.get(n))
  console.log(`사진 없음 → 대상: ${targets.length}명\n`)

  const found: { name: string; url: string }[] = []
  const missing: string[] = []

  for (const name of targets) {
    process.stdout.write(`  ${name} ... `)
    const url = await fetchWikiPhoto(name)
    if (url) {
      console.log(`✓ ${url.slice(0, 60)}...`)
      found.push({ name, url })
    } else {
      console.log('없음')
      missing.push(name)
    }
    await new Promise(r => setTimeout(r, 200))
  }

  console.log(`\n결과: 찾음 ${found.length} / 없음 ${missing.length}`)
  if (missing.length) console.log('없음:', missing.join(', '))

  if (!apply || found.length === 0) return

  // 4. upsert
  console.log('\n💾 저장 중...')
  const upserts = found.map(({ name, url }) => ({ name, photo_url: url }))
  const { error: uErr } = await sb
    .from('directors')
    .upsert(upserts, { onConflict: 'name', ignoreDuplicates: false })
  if (uErr) { console.error('저장 실패:', uErr.message); process.exit(1) }
  console.log(`✅ ${found.length}명 저장 완료`)
}

main().catch(console.error)
