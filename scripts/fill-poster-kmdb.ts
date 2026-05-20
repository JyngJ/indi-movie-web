/**
 * 포스터 없는 영화를 KMDB에서 채우기
 * 실행 (dry-run):  npx tsx --env-file=.env.local scripts/fill-poster-kmdb.ts
 * 실행 (적용):     npx tsx --env-file=.env.local scripts/fill-poster-kmdb.ts --apply
 */
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)
const KMDB_KEY = process.env.KMDB_SERVICE_KEY!

function clean(v?: string) {
  return (v ?? '').replace(/<!HS>|<!HE>|!HS|!HE/g, '').replace(/\s+/g, ' ').trim()
}

function firstUrl(v: string) {
  return v.split('|').map(s => s.trim()).find(Boolean) ?? null
}

async function fetchPoster(movieId: string, movieSeq: string): Promise<string | null> {
  const url = new URL('https://api.koreafilm.or.kr/openapi-data2/wisenut/search_api/search_json2.jsp')
  url.searchParams.set('collection', 'kmdb_new2')
  url.searchParams.set('ServiceKey', KMDB_KEY)
  url.searchParams.set('movieId', movieId)
  url.searchParams.set('movieSeq', movieSeq)
  url.searchParams.set('detail', 'Y')
  url.searchParams.set('listCount', '1')

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url.toString())
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json() as { Data?: Array<{ Result?: Array<Record<string, unknown>> }> }
      const item = json.Data?.[0]?.Result?.[0]
      if (!item) return null
      const raw = clean(item.posterUrl as string) || clean(item.posters as string)
      return firstUrl(raw)
    } catch (e) {
      if (attempt === 0) { await new Promise(r => setTimeout(r, 1500)); continue }
      throw e
    }
  }
  return null
}

async function main() {
  if (!KMDB_KEY) {
    console.error('❌ KMDB_SERVICE_KEY 환경변수가 없습니다.')
    process.exit(1)
  }

  const apply = process.argv.includes('--apply')
  if (!apply) console.log('🔍 dry-run 모드 (--apply 추가하면 실제 저장)\n')

  const { data: movies, error } = await sb
    .from('movies')
    .select('id, title, year, kmdb_id, kmdb_movie_seq')
    .is('poster_url', null)
    .not('kmdb_id', 'is', null)
    .not('kmdb_movie_seq', 'is', null)
    .order('title')

  if (error) { console.error('fetch 실패:', error.message); process.exit(1) }

  type Row = { id: string; title: string; year: number; kmdb_id: string; kmdb_movie_seq: string }
  const targets = (movies ?? []) as Row[]
  console.log(`포스터 없는 영화 (KMDB ID 있음): ${targets.length}개\n`)

  let filled = 0, missing = 0, failed = 0

  for (const m of targets) {
    process.stdout.write(`  ${m.title} (${m.year}) [${m.kmdb_id}/${m.kmdb_movie_seq}] ... `)
    try {
      const posterUrl = await fetchPoster(m.kmdb_id, m.kmdb_movie_seq)
      if (!posterUrl) {
        console.log('포스터 없음 (KMDB 미제공)')
        missing++
        continue
      }
      console.log(posterUrl)
      if (apply) {
        const { error: err } = await sb.from('movies').update({ poster_url: posterUrl }).eq('id', m.id)
        if (err) { console.log(`  ❌ 저장 실패: ${err.message}`); failed++ }
        else { console.log(`  ✅ 저장 완료`); filled++ }
      } else {
        filled++
      }
    } catch (e) {
      console.log(`에러: ${(e as Error).message}`)
      failed++
    }
    await new Promise(r => setTimeout(r, 300))
  }

  console.log(`\n완료 — 채울 수 있음: ${filled} / KMDB 미제공: ${missing} / 실패: ${failed}`)
}

main().catch(console.error)
