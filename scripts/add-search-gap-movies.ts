/**
 * 인앱 검색 "결과 없음" 로그에서 확인된 콘텐츠 갭 보강.
 * 실행: npx tsx --env-file=.env.local scripts/add-search-gap-movies.ts
 *
 * 데이미언 셔젤은 감독 필모그래피 전체(KMDB 감독검색)를,
 * 나머지는 개별 타이틀을 seed-cinephile-canon.ts와 동일한 방식(KMDB 보강 우선, 실패 시 최소 레코드)으로 넣는다.
 * 멱등: 이미 있는(정규화 제목+연도±1, kmdb_id) 영화는 건너뛴다.
 */
import { createClient } from '@supabase/supabase-js'
import { searchKmdbMovies, searchKmdbByDirector } from '../src/lib/admin/kmdb'
import { importAdminExternalMovie } from '../src/lib/admin/store'

type Film = { t: string; d: string[]; y: number; n: string; ot?: string }

// prettier-ignore
const FILMS: Film[] = [
  { t: '룩백', d: ['오시야마 키요타카'], y: 2024, n: '일본' },
  { t: '미치광이 삐에로', d: ['장-뤽 고다르'], y: 1965, n: '프랑스', ot: 'Pierrot le Fou' },
  { t: '비포 선라이즈', d: ['리처드 링클레이터'], y: 1995, n: '미국', ot: 'Before Sunrise' },
  { t: '탈주', d: ['이종필'], y: 2024, n: '한국' },
  { t: '태풍클럽', d: ['소마이 신지'], y: 1985, n: '일본' },
  { t: '노트북', d: ['닉 카사베츠'], y: 2004, n: '미국', ot: 'The Notebook' },
]

const DIRECTOR = { label: '데이미언 셔젤', names: ['데이미언 셔젤', '데미안 셔젤'] }

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
})
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const norm = (s: string) => s.replace(/\s+/g, '').replace(/[()（）:;·.,'"!?[\]-]/g, '').toLowerCase()

async function findExisting(f: Film): Promise<boolean> {
  const { data } = await sb.from('movies').select('id, title, year').ilike('title', `%${f.t.slice(0, 4)}%`)
  const nt = norm(f.t)
  return (data ?? []).some((m: any) => norm(m.title) === nt && Math.abs((m.year ?? 0) - f.y) <= 1)
}

async function tryKmdb(f: Film) {
  try {
    const results = await searchKmdbMovies(f.t)
    const nt = norm(f.t)
    const hit = results.find(
      (m: any) => m.year != null && Math.abs(Number(m.year) - f.y) <= 1 && norm(m.title) === nt,
    )
    return hit ?? null
  } catch {
    return null
  }
}

async function seedTitles() {
  let inserted = 0
  let enriched = 0
  let skipped = 0
  const minimalInserts: any[] = []

  for (const f of FILMS) {
    if (await findExisting(f)) {
      console.log(`  [스킵] ${f.t} (${f.y}) — 이미 있음`)
      skipped++
      continue
    }
    const kmdb = await tryKmdb(f)
    await sleep(120)
    if (kmdb) {
      try {
        await importAdminExternalMovie(kmdb)
        enriched++
        console.log(`  [KMDB보강] ${f.t} (${f.y})`)
        continue
      } catch {
        /* fall through to minimal */
      }
    }
    minimalInserts.push({
      title: f.t,
      original_title: f.ot ?? null,
      year: f.y,
      genre: [],
      director: f.d,
      nation: f.n,
    })
  }

  if (minimalInserts.length) {
    const { error } = await sb.from('movies').insert(minimalInserts)
    if (error) console.error('minimal insert 오류:', error.message)
    else {
      inserted = minimalInserts.length
      for (const m of minimalInserts) console.log(`  [최소삽입] ${m.title} (${m.year})`)
    }
  }

  console.log(`\n타이틀 결과: KMDB보강 ${enriched} / 최소삽입 ${inserted} / 스킵(기존) ${skipped}`)
}

async function seedDirector() {
  const seen = new Map<string, any>()
  for (const name of DIRECTOR.names) {
    for (let page = 0; page < 5; page++) {
      let results: any[] = []
      try {
        results = (await searchKmdbByDirector(name, page * 30)) as any[]
      } catch (e: any) {
        console.log(`  [${name} p${page}] 조회 오류: ${e.message}`)
        break
      }
      for (const m of results) {
        const key = `${m.movieId}|${m.movieSeq}`
        if (!seen.has(key)) seen.set(key, m)
      }
      await sleep(150)
      if (results.length < 30) break
    }
  }

  let count = 0
  for (const m of seen.values()) {
    try {
      await importAdminExternalMovie(m)
      count++
    } catch (e: any) {
      console.log(`  [${DIRECTOR.label}] 임포트 실패: ${e.message}`)
    }
    await sleep(120)
  }
  console.log(`\n${DIRECTOR.label} 필모그래피: ${count}편 임포트(신규+업데이트 포함, kmdb_id 기준 dedup)`)
}

async function main() {
  console.log('=== 감독 필모그래피 ===')
  await seedDirector()
  console.log('\n=== 개별 타이틀 ===')
  await seedTitles()
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
