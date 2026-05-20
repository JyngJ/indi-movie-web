/**
 * Dtryx 극장 booking_url을 딥링크(ShowSeq 포함)로 업데이트
 * 실행: npx tsx --env-file=.env.local scripts/update-dtryx-booking-urls.ts
 */
import { createClient } from '@supabase/supabase-js'
import { crawlAllDtryxSources } from '../src/lib/admin/crawler'
import type { AdminTheaterSource } from '../src/types/admin'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

async function main() {
  // 1. Dtryx 소스 목록 조회
  const { data: rows, error: srcErr } = await supabase
    .from('crawl_sources')
    .select('*')
    .eq('parser', 'dtryxReservationApi')
    .eq('enabled', true)

  if (srcErr) { console.error('소스 조회 실패:', srcErr.message); process.exit(1) }

  const sources = (rows ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    theaterId: r.theater_id as string,
    theaterName: r.theater_name as string,
    matchedTheaterId: r.matched_theater_id as string | undefined,
    homepageUrl: r.homepage_url as string,
    listingUrl: r.listing_url as string,
    parser: r.parser as string,
    enabled: true,
    cadence: r.cadence as string,
    health: r.health as AdminTheaterSource['health'],
    notes: r.notes as string | undefined,
  })) as AdminTheaterSource[]

  console.log(`Dtryx 소스 ${sources.length}개 재크롤 시작…\n`)

  // 2. 재크롤 (새 딥링크 URL 포함)
  const results = await crawlAllDtryxSources(sources)

  let candidateUpdated = 0

  for (const { source, candidates, error } of results) {
    if (error) {
      console.log(`❌ ${source.theaterName}: ${error}`)
      continue
    }

    if (candidates.length === 0) {
      console.log(`⚠️  ${source.theaterName}: 후보 없음`)
      continue
    }

    // 3. showtime_candidates booking_url 업데이트 (fingerprint 기준)
    for (const c of candidates) {
      const { error: cErr } = await supabase
        .from('showtime_candidates')
        .update({ booking_url: c.bookingUrl ?? null })
        .eq('fingerprint', c.fingerprint)

      if (!cErr) candidateUpdated++
    }

    console.log(`✓ ${source.theaterName}: ${candidates.length}개 처리`)
  }

  console.log(`\ncandidates 업데이트: ${candidateUpdated}건`)

  // 4. showtimes 업데이트 — approved candidates 기준으로 매칭
  console.log('\nshowtimes 업데이트 시작…')

  const { data: approvedCands, error: candsErr } = await supabase
    .from('showtime_candidates')
    .select('matched_theater_id,matched_movie_id,show_date,show_time,screen_name,booking_url')
    .like('booking_url', '%reserve/cinema.do%')
    .eq('status', 'approved')
    .not('matched_theater_id', 'is', null)

  if (candsErr) { console.error('approved candidates 조회 실패:', candsErr.message); process.exit(1) }

  console.log(`매칭 대상 approved candidates: ${approvedCands?.length ?? 0}건`)

  let showtimeUpdated = 0
  let showtimeFailed = 0

  for (const cand of approvedCands ?? []) {
    let query = supabase
      .from('showtimes')
      .update({ booking_url: cand.booking_url }, { count: 'exact' })
      .eq('theater_id', cand.matched_theater_id)
      .eq('show_date', cand.show_date)
      .eq('show_time', cand.show_time)

    if (cand.matched_movie_id) {
      query = query.eq('movie_id', cand.matched_movie_id)
    } else {
      query = query.eq('screen_name', cand.screen_name)
    }

    const { error: sErr, count } = await query

    if (sErr) {
      showtimeFailed++
    } else {
      showtimeUpdated += count ?? 0
    }
  }

  console.log(`showtimes 업데이트: ${showtimeUpdated}건, 실패: ${showtimeFailed}건`)

  // 5. 결과 확인
  const { count: remainOld } = await supabase
    .from('showtimes')
    .select('*', { count: 'exact', head: true })
    .like('booking_url', '%reserve/movie.do%')

  const { count: newCount } = await supabase
    .from('showtimes')
    .select('*', { count: 'exact', head: true })
    .like('booking_url', '%reserve/cinema.do%')

  console.log(`\n최종 — 구 URL(movie.do) 잔존: ${remainOld}건, 신 URL(cinema.do): ${newCount}건`)
}

main().catch(console.error)
