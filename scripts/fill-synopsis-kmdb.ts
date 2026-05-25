/**
 * movie_details 테이블에 KMDB 시놉시스 채우기
 * 실행: npx tsx --env-file=.env.local scripts/fill-synopsis-kmdb.ts
 *
 * - synopsis가 없는 movie_details 행만 대상
 * - kmdb_id + kmdb_movie_seq 없는 영화는 건너뜀
 * - 429/네트워크 에러 시 재시도 1회
 */
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)
const KMDB_KEY = process.env.KMDB_SERVICE_KEY!

function clean(v?: string) {
  return (v ?? '').replace(/<!HS>|<!HE>|!HS|!HE/g, '').replace(/\s+/g, ' ').trim()
}

type KmdbPlots = { plot?: Array<{ plotLang?: string; plotText?: string }> }

async function fetchKmdbSynopsis(movieId: string, movieSeq: string): Promise<string | null> {
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

      // plots.plot[].plotText — 한국어 우선, 없으면 첫 번째
      const plots = item.plots as KmdbPlots | undefined
      const plotList = plots?.plot ?? []
      const ko = plotList.find(p => p.plotLang === '한국어') ?? plotList[0]
      return clean(ko?.plotText) || null
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
  // synopsis 없는 movie_details + movies.kmdb_id/seq join
  const { data: movies, error } = await supabase
    .from('movies')
    .select('id, title, kmdb_id, kmdb_movie_seq, movie_details(synopsis)')
    .not('kmdb_id', 'is', null)
    .not('kmdb_movie_seq', 'is', null)

  if (error) { console.error('movies fetch 실패:', error.message); process.exit(1) }

  type MovieRow = {
    id: string
    title: string
    kmdb_id: string
    kmdb_movie_seq: string
    movie_details: { synopsis: string | null }[] | null
  }

  const targets = (movies as unknown as MovieRow[]).filter(m => {
    const s = Array.isArray(m.movie_details) ? m.movie_details[0]?.synopsis : (m.movie_details as { synopsis?: string } | null)?.synopsis
    return !s || s.trim().length === 0
  })

  console.log(`전체: ${movies?.length ?? 0} / 시놉시스 필요: ${targets.length}`)

  let filled = 0
  let skipped = 0
  let failed = 0

  for (const m of targets) {
    process.stdout.write(`  ${m.title} (${m.kmdb_id}/${m.kmdb_movie_seq}) ... `)
    try {
      const synopsis = await fetchKmdbSynopsis(m.kmdb_id, m.kmdb_movie_seq)

      if (!synopsis) {
        console.log('시놉시스 없음 (KMDB 미제공)')
        skipped++
        continue
      }

      const { error: upsertErr } = await supabase
        .from('movie_details')
        .upsert({ movie_id: m.id, synopsis }, { onConflict: 'movie_id' })

      if (upsertErr) {
        console.log(`upsert 실패: ${upsertErr.message}`)
        failed++
      } else {
        console.log(`✓ ${synopsis.slice(0, 50)}...`)
        filled++
      }
    } catch (e) {
      console.log(`에러: ${(e as Error).message}`)
      failed++
    }

    // API rate limit 방지
    await new Promise(r => setTimeout(r, 300))
  }

  console.log(`\n완료 — 채움: ${filled} / KMDB 미제공: ${skipped} / 실패: ${failed}`)
}

main().catch(console.error)
