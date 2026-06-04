/**
 * KMDB에서 영화 검색/임포트 + 동구영상미디어센터 candidates 재매칭
 * Usage: npx tsx --env-file=.env.local scripts/import-kmdb-movies.ts
 */
import { createClient } from '@supabase/supabase-js'
import { searchKmdbMovies } from '../src/lib/admin/kmdb'
import { importAdminExternalMovie } from '../src/lib/admin/store'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const DONGGU_SOURCE_ID = '9a697308-5c91-4c24-bc47-fb599e0631ed'
const DONGGU_MATCHED_THEATER_ID = 'dca63dee-8a72-49ae-a1fd-b12d3fc8ca17'

const MOVIES_TO_IMPORT = [
  { query: '국제시장', yearHint: 2014 },
  { query: '빅풋주니어', yearHint: null },
]

async function findOrImportMovie(query: string, yearHint: number | null) {
  console.log(`\n🔍 KMDB 검색: "${query}"`)
  const results = await searchKmdbMovies(query)

  if (results.length === 0) {
    console.log(`  ❌ 결과 없음`)
    return null
  }

  // 정확히 일치하는 타이틀 + 연도 힌트로 선택
  const exactMatch = results.find(r => {
    const titleMatch = r.title.trim() === query.trim()
    const yearMatch = yearHint ? r.year === yearHint : true
    return titleMatch && yearMatch
  }) ?? results.find(r => r.title.trim() === query.trim()) ?? results[0]

  console.log(`  선택: ${exactMatch.title} (${exactMatch.year}) — KMDB ${exactMatch.movieId}/${exactMatch.movieSeq}`)
  console.log(`  감독: ${exactMatch.director?.join(', ') || '없음'}`)
  console.log(`  장르: ${exactMatch.genre?.join(', ') || '없음'}`)

  // 이미 있는지 확인
  const { data: existing } = await supabase
    .from('movies')
    .select('id, title, year')
    .eq('kmdb_id', exactMatch.movieId)
    .eq('kmdb_movie_seq', exactMatch.movieSeq)
    .maybeSingle()

  if (existing) {
    console.log(`  ✅ 이미 DB에 있음 → id: ${existing.id}`)
    return existing.id as string
  }

  const imported = await importAdminExternalMovie(exactMatch)
  console.log(`  ✅ 임포트 완료 → id: ${imported.id}`)
  return imported.id as string
}

async function rematchDongguCandidates(movieTitle: string, movieId: string) {
  const today = new Date().toISOString().slice(0, 10)

  // 해당 영화 candidates 찾기
  const { data: candidates } = await supabase
    .from('showtime_candidates')
    .select('*')
    .eq('source_id', DONGGU_SOURCE_ID)
    .ilike('movie_title', movieTitle)
    .gte('show_date', today)
    .neq('status', 'rejected')

  if (!candidates || candidates.length === 0) {
    console.log(`  ⏩ 미래 candidates 없음 (${movieTitle})`)
    return
  }

  console.log(`  후보 ${candidates.length}개 매칭 중...`)

  for (const c of candidates) {
    const warnings = c.warnings ?? []
    const canAutoApprove = c.confidence >= 0.9 && warnings.length === 0

    const newStatus = canAutoApprove ? 'approved' : 'needs_review'

    await supabase
      .from('showtime_candidates')
      .update({
        matched_movie_id: movieId,
        status: newStatus,
        matched_theater_id: DONGGU_MATCHED_THEATER_ID,
      })
      .eq('id', c.id)

    if (canAutoApprove) {
      // showtimes upsert
      const { error } = await supabase.from('showtimes').upsert({
        theater_id: DONGGU_MATCHED_THEATER_ID,
        movie_id: movieId,
        show_date: c.show_date,
        show_time: c.show_time,
        end_time: c.end_time ?? null,
        screen_name: c.screen_name ?? null,
        format_type: c.format_type ?? 'standard',
        language: c.language ?? 'korean',
        seat_available: c.seat_available ?? 0,
        seat_total: c.seat_total ?? 0,
        price: c.price ?? 0,
        booking_url: c.booking_url ?? null,
        is_active: true,
      }, { onConflict: 'theater_id,movie_id,show_date,show_time,screen_name' })

      if (error) {
        console.warn(`    ⚠️ showtimes upsert 실패: ${error.message}`)
      } else {
        console.log(`    ✅ 자동승인: ${c.show_date} ${c.show_time}`)
      }
    } else {
      console.log(`    🟡 검토필요: ${c.show_date} ${c.show_time} (conf=${c.confidence}, warn=${warnings.length})`)
    }
  }
}

async function main() {
  const importedIds: Record<string, string> = {}

  for (const { query, yearHint } of MOVIES_TO_IMPORT) {
    try {
      const movieId = await findOrImportMovie(query, yearHint)
      if (movieId) importedIds[query] = movieId
    } catch (e) {
      console.error(`임포트 실패 (${query}):`, e)
    }
  }

  console.log('\n=== 동구영상미디어센터 candidates 재매칭 ===')
  for (const [title, movieId] of Object.entries(importedIds)) {
    console.log(`\n📽️ ${title}`)
    await rematchDongguCandidates(title, movieId)
  }

  console.log('\n=== 완료 ===')

  // 최종 현황
  const today = new Date().toISOString().slice(0, 10)
  const { count: futureShowtimes } = await supabase
    .from('showtimes')
    .select('*', { count: 'exact', head: true })
    .eq('theater_id', DONGGU_MATCHED_THEATER_ID)
    .gte('show_date', today)

  console.log(`동구영상미디어센터 미래 showtimes: ${futureShowtimes}개`)
}

main().catch(e => { console.error(e); process.exit(1) })
