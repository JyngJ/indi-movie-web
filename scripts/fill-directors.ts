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
 * 한 명만:        npx tsx --env-file=.env.local scripts/fill-directors.ts --apply --only=장준환
 */
import { createClient } from '@supabase/supabase-js'

const apply = process.argv.includes('--apply')
const force = process.argv.includes('--force')
/* 특정 감독 한 명만 처리한다. 사용자 추가 요청으로 영화 한 편이 들어오면 그 감독
 * 프로필만 채우면 되는데, 필터가 없으면 아직 안 받아온 수십 명이 같이 딸려 들어간다.
 * 동명이인을 잘못 긁는 경우가 있어(배우와 감독이 같은 이름) 한 명씩 확인하며 넣는 게 안전하다. */
const onlyArg = process.argv.find((a) => a.startsWith('--only='))
const only = onlyArg ? onlyArg.slice('--only='.length).trim() : ''

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

/* 동음이의 문서에서 감독 문서로 넘어갈 때 시도하는 괄호 표제어 (많이 쓰이는 순서). */
const DISAMBIGUATION_SUFFIXES = ['영화 감독', '영화감독', '감독', '영화 연출가']

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

    /* 동음이의 문서면 감독 문서를 따로 찾는다.
     * ko.wikipedia는 이름이 겹치면 바른 이름을 동음이의로 내준다 — 예: '장준환'은
     * 영화감독과 야구선수를 함께 담은 목록이라 요약문을 그대로 쓰면 엉뚱한 사람의
     * 약력이 들어간다. 괄호 표제어를 순서대로 두드려 감독 문서를 집는다. */
    if (json.type === 'disambiguation') {
      for (const suffix of DISAMBIGUATION_SUFFIXES) {
        const resolved = await fetchWikipedia(`${name} (${suffix})`)
        if (resolved.bio || resolved.photoUrl) return resolved
        await new Promise((r) => setTimeout(r, 200))
      }
      return {}
    }

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

  let targets = [...allNames].filter(n => !skipNames.has(n))
  if (only) {
    if (!allNames.has(only)) {
      console.error(`--only=${only}: movies.director에 없는 이름이다. 영화부터 넣어야 한다.`)
      process.exit(1)
    }
    targets = targets.filter(n => n === only)
    if (targets.length === 0) console.log(`--only=${only}: 이미 수집됨 — --force로 재수집 가능`)
  }
  console.log(`수집 대상: ${targets.length}명${only ? ` (--only=${only})` : ''}`)
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

      /* 이번에 못 받아온 값으로 이미 있는 값을 지우지 않는다. --force 재수집에서
       * 썸네일 없는 문서를 만나면 예전에 다른 경로(wikidata·naver·KMDB)로 받아둔
       * 사진이 null로 덮여 사라진다. 빈 값은 비워두는 게 아니라 두고 간다. */
      const { data: prev } = await sb
        .from('directors')
        .select('photo_url, bio, original_name')
        .eq('name', name)
        .maybeSingle()

      const { error: upsertErr } = await sb.from('directors').upsert({
        name,
        original_name: wiki.originalName ?? prev?.original_name ?? null,
        photo_url: photoUrl ?? prev?.photo_url ?? null,
        bio: bio ?? prev?.bio ?? null,
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
