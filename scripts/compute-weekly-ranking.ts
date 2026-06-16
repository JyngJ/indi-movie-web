/**
 * 독립영화 주간 랭킹 계산 — 매주 월요일 06:00 RPi cron에서 실행
 * 사용법: npm run curate:weekly-ranking
 *
 * 최초 실행 전 Supabase에서 supabase/seeds/11_film_rankings.sql 실행 필요
 *
 * 환경변수:
 *   POSTHOG_PERSONAL_API_KEY   PostHog personal API key (query:read 권한)
 *   POSTHOG_PROJECT_ID         PostHog 프로젝트 ID (숫자)
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import * as fs from 'fs'
import * as path from 'path'

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8')
  for (const line of content.split('\n')) {
    const m = line.match(/^([^=]+)=(.*)$/)
    if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim()
  }
}

import { createSupabaseAdminClient } from '@/lib/supabase/admin'

// ── 가중치 ──────────────────────────────────────────────────────────
const W_THEATER  = 0.45
const W_SHOWTIME = 0.30
const W_VIEW     = 0.25
const MIN_VIEW_COUNT = 5   // 이 미만이면 조회 점수 0으로 처리
const TOP_N = 20

// ── 날짜 헬퍼 ────────────────────────────────────────────────────────
/** 가장 최근에 완료된 Mon-Sun 주간 반환 */
function getLastWeekRange(): { weekStart: string; weekEnd: string } {
  const now = new Date()
  const dow = now.getDay() // 0=Sun 1=Mon … 6=Sat

  // last Sunday: dow===0 이면 7일 전, 아니면 dow일 전
  const daysToLastSunday = dow === 0 ? 7 : dow
  const lastSunday = new Date(now)
  lastSunday.setDate(now.getDate() - daysToLastSunday)

  const lastMonday = new Date(lastSunday)
  lastMonday.setDate(lastSunday.getDate() - 6)

  return {
    weekStart: lastMonday.toISOString().slice(0, 10),
    weekEnd: lastSunday.toISOString().slice(0, 10),
  }
}

function nextDay(iso: string): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

// ── PostHog HogQL ─────────────────────────────────────────────────
interface HogQLResponse {
  results: [string, number][]
}

async function fetchBookingClicks(weekStart: string, weekEnd: string): Promise<Map<string, number>> {
  const token = process.env.POSTHOG_PERSONAL_API_KEY
  const projectId = process.env.POSTHOG_PROJECT_ID
  if (!token || !projectId) throw new Error('POSTHOG_PERSONAL_API_KEY / POSTHOG_PROJECT_ID 없음')

  const query = `
    SELECT properties.movie_id, count() AS cnt
    FROM events
    WHERE event = 'booking_clicked'
      AND timestamp >= toDateTime('${weekStart} 00:00:00')
      AND timestamp < toDateTime('${nextDay(weekEnd)} 00:00:00')
      AND isNotNull(properties.movie_id)
    GROUP BY properties.movie_id
    HAVING count() >= ${MIN_VIEW_COUNT}
    ORDER BY cnt DESC
  `.trim()

  const res = await fetch(`https://app.posthog.com/api/projects/${projectId}/query/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PostHog query 실패 ${res.status}: ${text.slice(0, 200)}`)
  }

  const data = (await res.json()) as HogQLResponse
  const map = new Map<string, number>()
  for (const [movieId, cnt] of data.results ?? []) {
    if (movieId) map.set(String(movieId), Number(cnt))
  }
  console.log(`PostHog: booking_clicked ${map.size}개 영화 (>= ${MIN_VIEW_COUNT}회)`)
  return map
}

// ── 메인 ──────────────────────────────────────────────────────────
async function main() {
  const { weekStart, weekEnd } = getLastWeekRange()
  console.log(`집계 기간: ${weekStart} ~ ${weekEnd}`)

  const supabase = createSupabaseAdminClient()

  // 1. PostHog: booking_clicked 집계
  const viewCounts = await fetchBookingClicks(weekStart, weekEnd)

  // 2. Supabase: 해당 주 상영 데이터 (극장 수 + 회차 수)
  const { data: rows, error: showtimeErr } = await supabase
    .from('showtimes')
    .select('movie_id, theater_id')
    .eq('is_active', true)
    .gte('show_date', weekStart)
    .lte('show_date', weekEnd)

  if (showtimeErr) throw showtimeErr

  type Stats = { theaters: Set<string>; showtimes: number }
  const movieStats = new Map<string, Stats>()
  for (const { movie_id, theater_id } of rows ?? []) {
    if (!movieStats.has(movie_id)) movieStats.set(movie_id, { theaters: new Set(), showtimes: 0 })
    const s = movieStats.get(movie_id)!
    s.theaters.add(theater_id)
    s.showtimes++
  }

  console.log(`Supabase: 해당 주 상영 영화 ${movieStats.size}편`)

  if (movieStats.size === 0) {
    console.warn('상영 데이터 없음 — 중단')
    return
  }

  // 3. 정규화 + 가중 점수
  const maxTheaters = Math.max(...[...movieStats.values()].map((s) => s.theaters.size), 1)
  const maxShowtimes = Math.max(...[...movieStats.values()].map((s) => s.showtimes), 1)
  const maxViews = Math.max(...[...viewCounts.values()], 1)

  const scored = [...movieStats.entries()].map(([movieId, s]) => {
    const tNorm = s.theaters.size / maxTheaters
    const sNorm = s.showtimes / maxShowtimes
    const viewCount = viewCounts.get(movieId) ?? 0
    const vNorm = viewCount > 0 ? viewCount / maxViews : 0
    const score = tNorm * W_THEATER + sNorm * W_SHOWTIME + vNorm * W_VIEW
    return {
      movie_id: movieId,
      score,
      theater_count: s.theaters.size,
      showtime_count: s.showtimes,
      view_count: viewCount,
    }
  })

  scored.sort((a, b) => b.score - a.score)

  // 4. 전주 순위 → rank change 계산
  const { data: prevRow } = await supabase
    .from('film_rankings')
    .select('rankings')
    .lt('week_start', weekStart)
    .order('week_start', { ascending: false })
    .limit(1)
    .single()

  const prevRanks = new Map<string, number>()
  for (const entry of (prevRow?.rankings as { movie_id: string; rank: number }[] | null) ?? []) {
    prevRanks.set(entry.movie_id, entry.rank)
  }

  const rankings = scored.slice(0, TOP_N).map((item, i) => ({
    ...item,
    rank: i + 1,
    prev_rank: prevRanks.get(item.movie_id) ?? null,
  }))

  // 5. Upsert
  const { error: upsertErr } = await supabase
    .from('film_rankings')
    .upsert({ week_start: weekStart, rankings, computed_at: new Date().toISOString() })

  if (upsertErr) throw upsertErr

  console.log(`✓ 랭킹 저장 완료: ${weekStart} 기준 ${rankings.length}편`)
  rankings.slice(0, 5).forEach((r) => {
    const change = r.prev_rank == null ? 'NEW' : r.rank < r.prev_rank ? `▲${r.prev_rank - r.rank}` : r.rank > r.prev_rank ? `▼${r.rank - r.prev_rank}` : '='
    console.log(`  ${r.rank}위 [${change}] movie_id=${r.movie_id} score=${r.score.toFixed(3)} 극장${r.theater_count} 회차${r.showtime_count} 예약${r.view_count}`)
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
