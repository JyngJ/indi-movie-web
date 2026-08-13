/**
 * movies.runtime(분) KMDB 백필 — 러닝타임 큐레이션 섹션 선행 작업.
 * 사용법: npx tsx --env-file=.env.local scripts/backfill-runtime.ts
 *
 * 선행: supabase/seeds/16_movies_runtime.sql (컬럼 추가) 실행.
 * kmdb_id + kmdb_movie_seq 있는 영화만 대상, runtime이 이미 있으면 건너뛴다(멱등).
 * KMDB 호출은 순차 + 200ms 간격 스로틀.
 */
import { createClient } from '@supabase/supabase-js'
import { getKmdbMovie } from '../src/lib/admin/kmdb'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const targets: { id: string; title: string; kmdb_id: string; kmdb_movie_seq: string }[] = []
  let from = 0
  while (true) {
    const { data, error } = await sb
      .from('movies')
      .select('id, title, kmdb_id, kmdb_movie_seq, runtime')
      .not('kmdb_id', 'is', null)
      .not('kmdb_movie_seq', 'is', null)
      .is('runtime', null)
      .range(from, from + 999)
    if (error) throw error
    if (!data?.length) break
    targets.push(...(data as typeof targets))
    if (data.length < 1000) break
    from += 1000
  }
  console.log(`백필 대상: ${targets.length}편`)

  let ok = 0
  let miss = 0
  let fail = 0
  for (const [i, m] of targets.entries()) {
    try {
      const detail = await getKmdbMovie(m.kmdb_id, m.kmdb_movie_seq)
      if (detail.runtimeMinutes) {
        const { error } = await sb.from('movies').update({ runtime: detail.runtimeMinutes }).eq('id', m.id)
        if (error) throw error
        ok++
      } else {
        miss++
      }
    } catch (e) {
      fail++
      console.warn(`  실패: ${m.title} — ${(e as Error).message}`)
    }
    if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${targets.length} (저장 ${ok} · 정보없음 ${miss} · 실패 ${fail})`)
    await sleep(200)
  }
  console.log(`완료 — 저장 ${ok} · 정보없음 ${miss} · 실패 ${fail}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
