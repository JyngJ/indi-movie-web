/**
 * movies 테이블에 KMDB 감독 정보 채우기
 * 실행: npx tsx --env-file=.env.local scripts/fill-director-kmdb.ts [--apply]
 *
 * - director가 비어있는 movies 행만 대상
 * - kmdb_id + kmdb_movie_seq 없는 영화는 건너뜀
 * - --apply 없으면 dry-run (실제 업데이트 안 함)
 */
import { createClient } from '@supabase/supabase-js'

const apply = process.argv.includes('--apply')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)
const KMDB_KEY = process.env.KMDB_SERVICE_KEY!

function clean(v?: string) {
  return (v ?? '').replace(/<!HS>|<!HE>|!HS|!HE/g, '').replace(/\s+/g, ' ').trim()
}

function splitList(v?: string) {
  return clean(v).split(/[,|]/).map(s => s.trim()).filter(Boolean)
}

async function fetchDirectors(movieId: string, movieSeq: string): Promise<string[] | null> {
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
      const json = await res.json() as {
        Data?: Array<{ Result?: Array<Record<string, unknown>> }>
      }
      const item = json.Data?.[0]?.Result?.[0]
      if (!item) return null

      // KMDB 실제 구조: directors.director[].directorNm (중첩 배열)
      type KmdbDirectors = { director?: Array<{ directorNm?: string }> }
      const nested = (item.directors as KmdbDirectors | undefined)?.director ?? []
      const directors = nested
        .map(d => clean(d.directorNm))
        .filter(Boolean)

      return directors.length > 0 ? directors : null
    } catch (e) {
      if (attempt === 0) {
        await new Promise(r => setTimeout(r, 1500))
        continue
      }
      throw e
    }
  }
  return null
}

async function main() {
  const { data: movies, error } = await supabase
    .from('movies')
    .select('id, title, kmdb_id, kmdb_movie_seq, director')
    .not('kmdb_id', 'is', null)
    .not('kmdb_movie_seq', 'is', null)

  if (error) { console.error('movies fetch 실패:', error.message); process.exit(1) }

  type MovieRow = {
    id: string
    title: string
    kmdb_id: string
    kmdb_movie_seq: string
    director: string[] | null
  }

  const all = movies as unknown as MovieRow[]
  const targets = all.filter(m => !m.director || m.director.length === 0)
  const noKmdb = (await supabase.from('movies').select('id').filter('kmdb_id', 'is', null)).data?.length ?? 0

  console.log(`전체 영화: ${all.length}편`)
  console.log(`KMDB 연결 없음: ${noKmdb}편 (스킵)`)
  console.log(`감독 비어있음 (대상): ${targets.length}편`)
  console.log(`모드: ${apply ? '실제 적용 (--apply)' : 'dry-run (--apply 없음)'}`)
  console.log('')

  let filled = 0
  let noData = 0
  let failed = 0

  for (const m of targets) {
    process.stdout.write(`  ${m.title} (${m.kmdb_id}/${m.kmdb_movie_seq}) ... `)
    try {
      const directors = await fetchDirectors(m.kmdb_id, m.kmdb_movie_seq)

      if (!directors) {
        console.log('감독 정보 없음 (KMDB 미제공)')
        noData++
        continue
      }

      if (!apply) {
        console.log(`[dry-run] → ${directors.join(', ')}`)
        filled++
        continue
      }

      const { error: updateErr } = await supabase
        .from('movies')
        .update({ director: directors })
        .eq('id', m.id)

      if (updateErr) {
        console.log(`업데이트 실패: ${updateErr.message}`)
        failed++
      } else {
        console.log(`✓ ${directors.join(', ')}`)
        filled++
      }
    } catch (e) {
      console.log(`에러: ${(e as Error).message}`)
      failed++
    }

    await new Promise(r => setTimeout(r, 300))
  }

  console.log('')
  console.log(`완료 — ${apply ? '채움' : 'dry-run 가능'}: ${filled} / KMDB 미제공: ${noData} / 실패: ${failed}`)

  if (!apply && filled > 0) {
    console.log('\n실제 적용하려면: npx tsx --env-file=.env.local scripts/fill-director-kmdb.ts --apply')
  }
}

main().catch(console.error)
