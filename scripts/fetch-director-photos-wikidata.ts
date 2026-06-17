/**
 * Wikidata에서 영화감독 이미지 전체 다운로드 → photo_url 없는 감독과 매칭
 *
 * dry-run:  npx tsx --env-file=.env.local scripts/fetch-director-photos-wikidata.ts
 * 적용:     npx tsx --env-file=.env.local scripts/fetch-director-photos-wikidata.ts --apply
 */
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql'

// 한국어 이름 정규화: 공백/특수문자 제거, 소문자
function normalize(s: string) {
  return s.replace(/\s+/g, ' ').trim().toLowerCase()
}

async function fetchWikidataDirectors(): Promise<Map<string, string>> {
  const query = `
    SELECT ?label ?image WHERE {
      ?p wdt:P31 wd:Q5;
         wdt:P106 wd:Q2526255;
         wdt:P18 ?image;
         rdfs:label ?label.
      FILTER(LANG(?label) = "ko")
    }
  `
  const res = await fetch(SPARQL_ENDPOINT + '?query=' + encodeURIComponent(query), {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'indi-movie-web/0.1 (mailto:mail.jaeyong@gmail.com)',
    },
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) throw new Error(`Wikidata SPARQL 실패: ${res.status}`)
  const data = await res.json() as { results: { bindings: Array<{ label: { value: string }; image: { value: string } }> } }

  // 이름 → 이미지 URL 맵 (Commons FilePath → 실제 파일 URL)
  const map = new Map<string, string>()
  for (const { label, image } of data.results.bindings) {
    const key = normalize(label.value)
    const url = image.value.replace(
      'http://commons.wikimedia.org/wiki/Special:FilePath/',
      'https://commons.wikimedia.org/wiki/Special:FilePath/',
    )
    if (!map.has(key)) map.set(key, url)
  }
  return map
}

async function main() {
  const apply = process.argv.includes('--apply')
  if (!apply) console.log('🔍 dry-run (--apply 로 실제 저장)\n')

  console.log('Wikidata에서 감독 이미지 다운로드 중...')
  const wikiMap = await fetchWikidataDirectors()
  console.log(`Wikidata 감독 ${wikiMap.size}명 로드 완료\n`)

  // photo_url 없는 감독
  const { data: dirs, error } = await sb
    .from('directors')
    .select('name')
    .is('photo_url', null)
  if (error) { console.error(error.message); process.exit(1) }

  const targets = (dirs ?? []).map((d: { name: string }) => d.name)
  console.log(`photo_url 없는 감독: ${targets.length}명\n`)

  const found: { name: string; url: string }[] = []
  const missing: string[] = []

  for (const name of targets) {
    const key = normalize(name)
    const url = wikiMap.get(key)
    if (url) {
      console.log(`✓ ${name} → ${url.slice(0, 65)}`)
      found.push({ name, url })
    } else {
      missing.push(name)
    }
  }

  console.log(`\n결과: 찾음 ${found.length} / 없음 ${missing.length}`)
  if (missing.length) console.log('없음:', missing.join(', '))

  if (!apply || found.length === 0) return

  console.log('\n💾 저장 중...')
  const { error: uErr } = await sb
    .from('directors')
    .upsert(found.map(({ name, url }) => ({ name, photo_url: url })), { onConflict: 'name' })
  if (uErr) { console.error('저장 실패:', uErr.message); process.exit(1) }
  console.log(`✅ ${found.length}명 저장 완료`)
}

main().catch(console.error)
