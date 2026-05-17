/**
 * 감독 프로필(사진 + 약력) 수집 — Wikipedia → KMDB People 순으로 시도
 *
 * 사전 조건: Supabase에 directors 테이블 생성 (아래 SQL)
 *   create table directors (
 *     name text primary key,
 *     photo_url text,
 *     bio text,
 *     source text,
 *     updated_at timestamptz default now()
 *   );
 *
 * 실행 (dry-run):  npx tsx --env-file=.env.local scripts/fill-directors.ts
 * 실행 (적용):     npx tsx --env-file=.env.local scripts/fill-directors.ts --apply
 * 재수집 포함:     npx tsx --env-file=.env.local scripts/fill-directors.ts --apply --force
 */
import { createClient } from '@supabase/supabase-js'

const apply = process.argv.includes('--apply')
const force = process.argv.includes('--force')

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)
const KMDB_KEY = process.env.KMDB_SERVICE_KEY!

function clean(v?: string) {
  return (v ?? '').replace(/<!HS>|<!HE>|!HS|!HE/g, '').replace(/\s+/g, ' ').trim()
}

/* ── Wikipedia ──────────────────────────────────────────────────── */
interface WikiResult {
  bio?: string
  photoUrl?: string
  originalName?: string
}

function parseOriginalName(extract: string): string | undefined {
  // "홍길동(영어: Hong Gildong, ...)" 또는 "홍길동(John Doe, ...)" 패턴
  const m = extract.match(/[（(](?:[가-힣]+:\s*)?([A-Za-zÀ-ÖØ-öø-ÿ\s\-'".]+?)(?:,\s*\d|[）)])/)
  if (!m) return undefined
  const candidate = m[1].trim()
  // 너무 짧거나 숫자만 있으면 스킵
  if (candidate.length < 3 || /^\d+$/.test(candidate)) return undefined
  return candidate
}

const FILM_KEYWORDS = [
  '영화 감독', '감독', '영화인', '영화배우', '시나리오', '각본', '다큐멘터리',
  'director', 'filmmaker', 'film', 'cinema',
  '연출', '촬영감독', '제작자', '프로듀서',
  '배우', '작가', '예술가', '사진작가', '미술가',
]

async function fetchWikipedia(name: string): Promise<WikiResult> {
  const encoded = encodeURIComponent(name)
  const url = `https://ko.wikipedia.org/api/rest_v1/page/summary/${encoded}`
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'indi-movie-app/1.0' } })
    if (!res.ok) return {}
    const json = await res.json() as {
      extract?: string
      thumbnail?: { source?: string }
      type?: string
      description?: string
    }

    // disambiguation 페이지면 스킵
    if (json.type === 'disambiguation') return {}

    const extract = json.extract ?? ''
    const description = json.description ?? ''
    const combined = (extract + ' ' + description).toLowerCase()

    // 영화/예술 관련 키워드 없으면 오탐으로 판단
    const isRelevant = FILM_KEYWORDS.some(kw => combined.includes(kw.toLowerCase()))
    if (!isRelevant) return {}

    const firstLine = extract ? extract.split('\n')[0] ?? '' : ''
    const bio = firstLine.slice(0, 400) || undefined
    const photoUrl = json.thumbnail?.source || undefined
    const originalName = firstLine ? parseOriginalName(firstLine) : undefined

    return { bio, photoUrl, originalName }
  } catch {
    return {}
  }
}

/* ── KMDB People ─────────────────────────────────────────────────── */
interface KmdbPersonResult {
  bio?: string
  photoUrl?: string
}

async function fetchKmdbPeople(name: string): Promise<KmdbPersonResult> {
  if (!KMDB_KEY) return {}
  const url = new URL('https://api.koreafilm.or.kr/openapi-data2/wisenut/search_api/search_json2.jsp')
  url.searchParams.set('collection', 'People')
  url.searchParams.set('ServiceKey', KMDB_KEY)
  url.searchParams.set('directorNm', name)
  url.searchParams.set('detail', 'Y')
  url.searchParams.set('listCount', '1')

  try {
    const res = await fetch(url.toString())
    if (!res.ok) return {}
    const json = await res.json() as {
      Data?: Array<{ Result?: Array<Record<string, unknown>> }>
    }
    const item = json.Data?.[0]?.Result?.[0]
    if (!item) return {}

    // KMDB People 필드명은 API 버전마다 다를 수 있음
    const photoUrl = (item.repPhotoUrl ?? item.photoUrl ?? item.imgUrl) as string | undefined
    const bio = clean((item.profile ?? item.biography ?? item.intro) as string | undefined)

    return {
      photoUrl: photoUrl || undefined,
      bio: bio || undefined,
    }
  } catch {
    return {}
  }
}

/* ── 메인 ────────────────────────────────────────────────────────── */
async function main() {
  // 1. 영화 테이블에서 감독 이름 전부 수집
  const { data: movies, error } = await sb
    .from('movies')
    .select('director')
  if (error) { console.error('movies 조회 실패:', error.message); process.exit(1) }

  const allNames = new Set<string>()
  for (const m of movies ?? []) {
    for (const d of (m.director as string[] | null) ?? []) {
      if (d.trim()) allNames.add(d.trim())
    }
  }
  console.log(`전체 감독 이름: ${allNames.size}명`)

  // 2. 이미 수집된 감독 목록
  let skipNames = new Set<string>()
  if (!force) {
    const { data: existing } = await sb.from('directors').select('name')
    skipNames = new Set((existing ?? []).map((r: { name: string }) => r.name))
    console.log(`이미 수집됨: ${skipNames.size}명 (스킵 — --force로 재수집 가능)`)
  }

  const targets = [...allNames].filter(n => !skipNames.has(n))
  console.log(`수집 대상: ${targets.length}명`)
  console.log(`모드: ${apply ? '실제 적용 (--apply)' : 'dry-run'}`)
  console.log('')

  let wikiHit = 0, kmdbHit = 0, noData = 0, failed = 0

  for (const name of targets) {
    process.stdout.write(`  ${name} ... `)
    try {
      // Wikipedia 먼저
      const wiki = await fetchWikipedia(name)
      await new Promise(r => setTimeout(r, 200))

      let photoUrl = wiki.photoUrl
      let bio = wiki.bio
      let source = wiki.photoUrl || wiki.bio ? 'wikipedia' : ''

      // 사진이 없으면 KMDB People 시도
      if (!photoUrl && KMDB_KEY) {
        const kmdb = await fetchKmdbPeople(name)
        await new Promise(r => setTimeout(r, 300))
        if (kmdb.photoUrl) { photoUrl = kmdb.photoUrl; source = source ? 'wikipedia+kmdb' : 'kmdb' }
        if (!bio && kmdb.bio) { bio = kmdb.bio; source = source || 'kmdb' }
      }

      if (!photoUrl && !bio) {
        console.log('데이터 없음')
        noData++
        if (!apply) continue
        // 소스 없어도 name은 기록 (재시도 방지)
        await sb.from('directors').upsert({ name, source: 'none', updated_at: new Date().toISOString() }, { onConflict: 'name' })
        continue
      }

      const label = [photoUrl ? '사진' : '', bio ? '약력' : ''].filter(Boolean).join('+')
      console.log(`[${source}] ${label} — ${bio?.slice(0, 60)}...`)

      if (source.includes('wikipedia')) wikiHit++
      else kmdbHit++

      if (!apply) continue

      const { error: upsertErr } = await sb.from('directors').upsert({
        name,
        original_name: wiki.originalName ?? null,
        photo_url: photoUrl ?? null,
        bio: bio ?? null,
        source,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'name' })

      if (upsertErr) {
        console.log(`  저장 실패: ${upsertErr.message}`)
        failed++
      }
    } catch (e) {
      console.log(`에러: ${(e as Error).message}`)
      failed++
    }
  }

  console.log('')
  console.log(`완료 — Wikipedia: ${wikiHit} / KMDB: ${kmdbHit} / 없음: ${noData} / 실패: ${failed}`)
  if (!apply) {
    console.log('\n실제 저장하려면: npx tsx --env-file=.env.local scripts/fill-directors.ts --apply')
  }
}

main().catch(console.error)
