/**
 * 광주독립영화관 (movieeeTicketApi) + 동구영상미디어센터 (donggumc.kr) 수동 크롤
 * Usage: npx tsx --env-file=.env.local scripts/crawl-gwangju.ts
 */
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// ─── stableId (crawler.ts와 동일) ───
function stableId(value: string) {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return `st_${Math.abs(hash).toString(36)}`
}

// ─── 광주독립영화관 (movieee tid=128) ───
async function crawlGwangjuIndie() {
  const SOURCE_ID = '2ae1f743-9125-4a5b-b4bd-a9aa4c0ef4b2'
  const THEATER_ID = SOURCE_ID
  const MATCHED_THEATER_ID = 'e99e0631-06f0-4e98-8858-9e8dbc810ec1'
  const THEATER_NAME = '광주독립영화관'
  const TID = '128'
  const ORIGIN = 'https://moviee.co.kr'
  const LISTING_URL = `${ORIGIN}/Movie/Ticket?tid=${TID}`

  const headers = {
    'user-agent': 'Mozilla/5.0 (compatible; indi-movie-web-admin-crawler/0.1)',
    accept: 'application/json, text/javascript, */*; q=0.01',
    'accept-language': 'ko-KR,ko;q=0.9,en;q=0.8',
    'x-requested-with': 'XMLHttpRequest',
    referer: LISTING_URL,
  }

  // 1) enable source + set matched_theater_id
  await supabase.from('crawl_sources').update({
    enabled: true,
    matched_theater_id: MATCHED_THEATER_ID,
    health: 'healthy',
  }).eq('id', SOURCE_ID)
  console.log(`✅ ${THEATER_NAME} source enabled, matched_theater_id set`)

  // 2) 상영일 목록
  const dateRes = await fetch(
    `${ORIGIN}/api/TicketApi/GetPlayDateList?tid=${TID}&CurPage=1&PageSize=100`,
    { headers }
  )
  const dateData = await dateRes.json() as { ResData?: { Table?: { PLAY_DT: string }[] } }
  const playDates = (dateData.ResData?.Table ?? [])
    .map((d) => d.PLAY_DT)
    .filter(Boolean)
    .slice(0, 14)
  console.log(`  상영일 ${playDates.length}개: ${playDates.join(', ')}`)

  // 3) 각 날짜 상영시간 수집
  const candidates: object[] = []
  for (const playDate of playDates) {
    const params = new URLSearchParams({ tid: TID, PlayDt: playDate, CurPage: '1', PageSize: '100' })
    const timeRes = await fetch(`${ORIGIN}/api/TicketApi/GetPlayTimeList?${params}`, { headers })
    const timeData = await timeRes.json() as {
      ResData?: { Table?: Array<{
        PLAY_DT: string; PLAY_TIME: string; END_TIME: string; M_NM: string;
        TS_NM: string; REMAINSEAT_CNT: string; SEAT_CNT: string;
        TICKET_STOP_YN: string; RESERVE_YN: string
      }> }
    }
    const rows = timeData.ResData?.Table ?? []

    for (const row of rows) {
      const movieTitle = (row.M_NM ?? '').trim().replace(/\s*\(.*?\)\s*/g, '').trim()
      const rawTime = (row.PLAY_TIME ?? '').replace(/(\d{2})(\d{2})$/, '$1:$2').slice(0, 5)
      const rawEnd = (row.END_TIME ?? '').replace(/(\d{2})(\d{2})$/, '$1:$2').slice(0, 5)
      const screenName = (row.TS_NM ?? '1관').trim() || '1관'
      if (!movieTitle || !rawTime) continue

      const fp = `${THEATER_ID}|${movieTitle}|${playDate}|${rawTime}|${screenName}`.toLowerCase()
      const closed = row.TICKET_STOP_YN === '1' || row.RESERVE_YN === '0'
      candidates.push({
        id: stableId(fp),
        source_id: SOURCE_ID,
        theater_id: THEATER_ID,
        theater_name: THEATER_NAME,
        matched_theater_id: MATCHED_THEATER_ID,
        movie_title: movieTitle,
        screen_name: screenName,
        show_date: playDate,
        show_time: rawTime,
        end_time: rawEnd || null,
        format_type: 'standard',
        language: 'korean',
        seat_available: parseInt(row.REMAINSEAT_CNT || '0', 10),
        seat_total: parseInt(row.SEAT_CNT || '0', 10),
        price: 0,
        booking_url: LISTING_URL,
        source_url: LISTING_URL,
        raw_text: JSON.stringify(row),
        confidence: closed ? 0.82 : 0.96,
        warnings: closed ? ['예매 종료 또는 예매 불가 회차입니다.'] : [],
        status: 'draft',
        fingerprint: fp,
      })
    }
  }

  console.log(`  후보 ${candidates.length}개 수집`)

  if (candidates.length > 0) {
    const { error } = await supabase
      .from('showtime_candidates')
      .upsert(candidates, { onConflict: 'fingerprint' })
    if (error) throw new Error(`candidates upsert 실패: ${error.message}`)
  }

  // crawl_run 기록
  await supabase.from('crawl_runs').insert({
    id: `run_${Date.now().toString(36)}`,
    source_id: SOURCE_ID,
    source_name: THEATER_NAME,
    input_kind: 'url',
    status: 'completed',
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
    created_count: candidates.length,
    updated_count: 0,
    warning_count: 0,
    error: null,
  })

  console.log(`✅ ${THEATER_NAME} — ${candidates.length}개 저장 완료`)
}

// ─── 동구영상미디어센터 (donggumc.kr 커스텀 파서) ───
function parseKoreanDate(dateStr: string): string | null {
  // "2026년 6월 26일 금요일" → "2026-06-26"
  const m = dateStr.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/)
  if (!m) return null
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
}

function parseKoreanTime(timeStr: string): string | null {
  // "저녁 7시" → "19:00"
  // "오후 3시 30분" → "15:30"
  // "오전 10시" → "10:00"
  // "14:00" → "14:00"
  const colon = timeStr.match(/(\d{1,2}):(\d{2})/)
  if (colon) return `${colon[1].padStart(2, '0')}:${colon[2]}`

  const korean = timeStr.match(/(오전|오후|저녁|밤|새벽)?\s*(\d{1,2})시(?:\s*(\d{1,2})분)?/)
  if (!korean) return null

  let h = parseInt(korean[2], 10)
  const min = korean[3] ? parseInt(korean[3], 10) : 0
  const period = korean[1] ?? ''

  if (period === '오후' || period === '저녁' || period === '밤') {
    if (h < 12) h += 12
  } else if (period === '오전' || period === '새벽') {
    if (h === 12) h = 0
  } else {
    // 힌트 없이 7시 이하면 오후로 간주 (일반적으로 저녁 상영)
    if (h <= 7 && h !== 0) h += 12
  }

  return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
}

async function crawlDongguMC() {
  const SOURCE_ID = '9a697308-5c91-4c24-bc47-fb599e0631ed'
  const THEATER_ID = SOURCE_ID
  const MATCHED_THEATER_ID = 'dca63dee-8a72-49ae-a1fd-b12d3fc8ca17'
  const THEATER_NAME = '동구영상미디어센터'
  const LISTING_URL = 'http://www.donggumc.kr/bbs/board.php?bo_table=6_1&me_code=60'

  // 1) listing_url, matched_theater_id 업데이트
  await supabase.from('crawl_sources').update({
    listing_url: LISTING_URL,
    homepage_url: 'http://www.donggumc.kr',
    matched_theater_id: MATCHED_THEATER_ID,
    health: 'healthy',
  }).eq('id', SOURCE_ID)
  console.log(`✅ ${THEATER_NAME} source URL 설정, matched_theater_id set`)

  // 2) 페이지 크롤
  const res = await fetch(LISTING_URL, {
    headers: { 'user-agent': 'indi-movie-web-admin-crawler/0.1' },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`페이지 로드 실패: ${res.status}`)
  const html = await res.text()

  // 3) 영화 블록 파싱 — 각 상영 항목은 영화 제목 링크 + 상영일/시간/장소 포함
  // 패턴: bo_table=6_1&amp;wr_id=NNN href에 &amp; 사용, 날짜는 width="450" TD에
  const today = new Date().toISOString().slice(0, 10)
  const blocks = [...html.matchAll(
    /bo_table=6_1&amp;wr_id=(\d+)[^>]*>([^<\t\n]+)<\/a>[\s\S]{0,1500}?<td width="450">([^<]+)<\/td>[\s\S]{0,500}?상영시간[\s\S]{0,300}?<td>([^<&][^<]*)<\/td>[\s\S]{0,300}?상영장소[\s\S]{0,300}?<td>([^<&][^<]*)<\/td>/g
  )]

  console.log(`  블록 ${blocks.length}개 감지`)

  const candidates: object[] = []
  for (const block of blocks) {
    const movieTitle = block[2].trim()
    const showDate = parseKoreanDate(block[3].trim())
    const showTime = parseKoreanTime(block[4].trim())
    const screenName = block[5].trim() || '아트홀'

    if (!movieTitle || !showDate || !showTime) {
      console.warn(`  ⚠️ 파싱 실패: title=${movieTitle}, date=${block[3].trim()}, time=${block[4].trim()}`)
      continue
    }
    // 오늘 이전 날짜는 skip
    if (showDate < today) {
      console.log(`  ⏩ 과거 skip: ${movieTitle} (${showDate})`)
      continue
    }

    console.log(`  📽️ ${movieTitle} | ${showDate} ${showTime} | ${screenName}`)

    const fp = `${THEATER_ID}|${movieTitle}|${showDate}|${showTime}|${screenName}`.toLowerCase()
    candidates.push({
      id: stableId(fp),
      source_id: SOURCE_ID,
      theater_id: THEATER_ID,
      theater_name: THEATER_NAME,
      matched_theater_id: MATCHED_THEATER_ID,
      movie_title: movieTitle,
      screen_name: screenName,
      show_date: showDate,
      show_time: showTime,
      end_time: null,
      format_type: 'standard',
      language: 'korean',
      seat_available: 0,
      seat_total: 0,
      price: 0,
      booking_url: null,
      source_url: LISTING_URL,
      raw_text: JSON.stringify({ movieTitle, showDate, showTime, screenName }),
      confidence: 0.88,
      warnings: ['좌석/예매 정보 없음'],
      status: 'needs_review',
      fingerprint: fp,
    })
  }

  if (candidates.length === 0) {
    console.warn('  ⚠️ 파싱된 상영 없음 — 사이트 구조 확인 필요')
  } else {
    const { error } = await supabase
      .from('showtime_candidates')
      .upsert(candidates, { onConflict: 'fingerprint' })
    if (error) throw new Error(`candidates upsert 실패: ${error.message}`)
  }

  // crawl_run 기록
  await supabase.from('crawl_runs').insert({
    id: `run_${Date.now().toString(36)}`,
    source_id: SOURCE_ID,
    source_name: THEATER_NAME,
    input_kind: 'url',
    status: candidates.length > 0 ? 'completed' : 'failed',
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
    created_count: candidates.length,
    updated_count: 0,
    warning_count: candidates.length,
    error: candidates.length === 0 ? '파싱된 상영 없음' : null,
  })

  console.log(`✅ ${THEATER_NAME} — ${candidates.length}개 저장 완료`)
}

async function main() {
  console.log('=== 광주독립영화관 크롤 시작 ===')
  try {
    await crawlGwangjuIndie()
  } catch (e) {
    console.error('광주독립영화관 크롤 실패:', e)
  }

  console.log('\n=== 동구영상미디어센터 크롤 시작 ===')
  try {
    await crawlDongguMC()
  } catch (e) {
    console.error('동구영상미디어센터 크롤 실패:', e)
  }
}

main()
