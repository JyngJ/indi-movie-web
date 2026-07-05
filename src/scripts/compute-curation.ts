/**
 * 큐레이션 스냅샷 계산 스크립트 — 매일 크롤 완료 후 실행
 * 사용법: npm run crawl:curation
 *
 * 최초 실행 전 Supabase에서 아래 SQL을 실행하세요:
 *
 *   CREATE TABLE IF NOT EXISTS curation_cache (
 *     id SMALLINT PRIMARY KEY DEFAULT 1,
 *     returning_films JSONB NOT NULL DEFAULT '[]'::jsonb,
 *     new_indie_films JSONB NOT NULL DEFAULT '[]'::jsonb,
 *     computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 *   );
 *   INSERT INTO curation_cache (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
 *   ALTER TABLE curation_cache ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "anyone can read curation cache"
 *     ON curation_cache FOR SELECT USING (true);
 */

import * as fs from 'fs'
import * as path from 'path'

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const [, key, value] = match
      if (!process.env[key.trim()]) process.env[key.trim()] = value.trim()
    }
  })
}

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { rowToMovie } from '@/lib/supabase/movieRow'
import { addDaysIso, formatLocalDate } from '@/lib/date'
import { clusterDatesToRuns, getReturningFilms } from '@/lib/curation/getReturningFilms'
import { getNewIndieFilms } from '@/lib/curation/getNewIndieFilms'
import { fetchCine21Rating } from '@/lib/admin/cine21'
import type { Movie } from '@/types/api'
import type { NewIndieFilmCandidate, ReturningFilmCandidate, LastWeekFilm, SoloTheaterFilm, SoloTheaterFilmsByRegion } from '@/lib/curation/types'
import { getRegionFromCity } from '@/lib/regions'
import { isLeadtimeConfirmed, MIN_LEADTIME_SAMPLES } from '@/lib/curation/leadtime'
import { combineConfidence } from '@/lib/curation/confidence'
import { getLastWeekBadgeText } from '@/lib/curation/lastWeekBadge'
import { findKobisMovieCd, fetchScreenCountTrend, isScreenCountDeclining } from '@/lib/kobis/getBoxOfficeTrend'

const KOBIS_API_KEY = process.env.KOBIS_API_KEY

/** 이 평점 미만인 영화는 큐레이션 섹션에서 제외 (10점 만점, cine21 관객 별점 기준) */
const RATING_THRESHOLD = 5.0

function addMonthsToIso(dateStr: string, months: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  const shifted = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, d.getUTCDate()))
  return shifted.toISOString().slice(0, 10)
}

/** "2026-07-05" → "20260705" (KOBIS API 날짜 포맷) */
function toKobisDate(iso: string): string {
  return iso.replaceAll('-', '')
}

function getMondayIso(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  const dow = d.getUTCDay()
  const offset = dow === 0 ? -6 : 1 - dow
  const mon = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + offset))
  return mon.toISOString().slice(0, 10)
}

function getSundayIso(mondayStr: string): string {
  const d = new Date(`${mondayStr}T00:00:00Z`)
  const sun = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 6))
  return sun.toISOString().slice(0, 10)
}

/** 영화별로 현재 상영 중인 지역 목록을 조회 — 큐레이션 섹션의 검색 지역 필터에 사용 */
async function getRegionsByMovie(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  movieIds: string[],
  range: { gte?: string; lte?: string } = {},
): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>()
  if (movieIds.length === 0) return map

  let query = supabase
    .from('showtimes')
    .select('movie_id, theaters(city)')
    .eq('is_active', true)
    .in('movie_id', movieIds)

  if (range.gte) query = query.gte('show_date', range.gte)
  if (range.lte) query = query.lte('show_date', range.lte)

  const { data, error } = await query
  if (error) throw error

  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const mid = row.movie_id as string
    const theaterRaw = row.theaters as Record<string, unknown> | null
    if (!mid || !theaterRaw) continue
    const region = getRegionFromCity(String(theaterRaw.city))
    if (region === '기타') continue
    if (!map.has(mid)) map.set(mid, new Set())
    map.get(mid)!.add(region)
  }
  return map
}

/** rating이 비어있는 영화는 cine21에서 평점을 가져와 movies 테이블에 채워둠 */
async function ensureMovieRatings(supabase: ReturnType<typeof createSupabaseAdminClient>, movies: Movie[]): Promise<void> {
  for (const movie of movies) {
    if (movie.rating != null) continue
    const rating = await fetchCine21Rating(movie.title, movie.year).catch(() => undefined)
    if (rating == null) continue
    movie.rating = rating
    const { error } = await supabase.from('movies').update({ rating }).eq('id', movie.id)
    if (error) console.error(`  평점 저장 실패 (${movie.title}):`, error.message)
  }
}

/** 평점이 RATING_THRESHOLD 미만인 영화는 큐레이션에서 제외 (평점 정보 없으면 통과) */
function filterByRating<T extends { movie: Movie }>(items: T[]): T[] {
  return items.filter(({ movie }) => movie.rating == null || movie.rating >= RATING_THRESHOLD)
}

async function computeReturningFilms(supabase: ReturnType<typeof createSupabaseAdminClient>, asOfDate: string) {
  console.log('  오랜만에 상영 계산 중...')

  const { data: currentRows, error: e1 } = await supabase
    .from('showtimes')
    .select('movie_id')
    .eq('is_active', true)
    .gte('show_date', asOfDate)
    .lte('show_date', addMonthsToIso(asOfDate, 1))

  if (e1) throw e1

  const currentMovieIds = [...new Set((currentRows ?? []).map((r: Record<string, unknown>) => r.movie_id as string).filter(Boolean))]
  if (currentMovieIds.length === 0) { console.log('  현재 상영 중인 영화 없음'); return [] }

  const twelveMonthsAgo = addMonthsToIso(asOfDate, -12)
  const { data: oldRows, error: e2 } = await supabase
    .from('showtimes')
    .select('movie_id')
    .in('movie_id', currentMovieIds)
    .lt('show_date', twelveMonthsAgo)

  if (e2) throw e2

  const hadOldIds = new Set((oldRows ?? []).map((r: Record<string, unknown>) => r.movie_id as string).filter(Boolean))
  const candidateIds = currentMovieIds.filter(id => hadOldIds.has(id))
  if (candidateIds.length === 0) { console.log('  오랜만에 상영 후보 없음'); return [] }
  console.log(`  후보 ${candidateIds.length}편 발견`)

  const sixYearsAgo = addMonthsToIso(asOfDate, -72)
  const { data: historyRows, error: e3 } = await supabase
    .from('showtimes')
    .select('movie_id, show_date, movies(id, title, original_title, year, poster_url, genre, director, nation, kmdb_id, tmdb_id, rating)')
    .in('movie_id', candidateIds)
    .gte('show_date', sixYearsAgo)
    .order('show_date', { ascending: true })

  if (e3) throw e3

  const movieDateMap = new Map<string, { movie: Movie; dates: string[] }>()
  for (const row of (historyRows ?? []) as Record<string, unknown>[]) {
    const mid = row.movie_id as string
    const movieRaw = row.movies as Record<string, unknown> | null
    if (!mid || !movieRaw) continue
    if (!movieDateMap.has(mid)) movieDateMap.set(mid, { movie: rowToMovie(movieRaw), dates: [] })
    movieDateMap.get(mid)!.dates.push(row.show_date as string)
  }

  const candidates: ReturningFilmCandidate[] = [...movieDateMap.values()].map(({ movie, dates }) => ({
    movie,
    runs: clusterDatesToRuns([...new Set(dates)].sort()),
  }))

  const allResults = await getReturningFilms({ getCandidates: async () => candidates }, asOfDate)

  await ensureMovieRatings(supabase, allResults.map(r => r.movie))
  const results = filterByRating(allResults)

  const regionsMap = await getRegionsByMovie(supabase, results.map(r => r.movie.id), { gte: asOfDate, lte: addMonthsToIso(asOfDate, 1) })
  for (const result of results) {
    result.regions = [...(regionsMap.get(result.movie.id) ?? [])]
  }

  console.log(`  결과: ${results.length}편 (평점 미달 제외 ${allResults.length - results.length}편)`)
  return results
}

async function computeNewIndieFilms(supabase: ReturnType<typeof createSupabaseAdminClient>, asOfDate: string) {
  console.log('  이번 주 새로 개봉 계산 중...')

  const weekStart = getMondayIso(asOfDate)
  const weekEnd = getSundayIso(weekStart)
  console.log(`  기간: ${weekStart} ~ ${weekEnd}`)

  const { data: thisWeekRows, error: e1 } = await supabase
    .from('showtimes')
    .select('movie_id')
    .gte('show_date', weekStart)
    .lte('show_date', weekEnd)

  if (e1) throw e1

  const thisWeekIds = [...new Set((thisWeekRows ?? []).map((r: Record<string, unknown>) => r.movie_id as string).filter(Boolean))]
  if (thisWeekIds.length === 0) { console.log('  이번 주 상영 없음'); return [] }

  const { data: priorRows, error: e2 } = await supabase
    .from('showtimes')
    .select('movie_id')
    .in('movie_id', thisWeekIds)
    .lt('show_date', weekStart)

  if (e2) throw e2

  const hadPriorIds = new Set((priorRows ?? []).map((r: Record<string, unknown>) => r.movie_id as string).filter(Boolean))
  const newIds = thisWeekIds.filter(id => !hadPriorIds.has(id))
  if (newIds.length === 0) { console.log('  이번 주 신규 개봉작 없음'); return [] }

  // 오늘 이후 상영이 남아있는 영화만 포함
  const { data: futureRows, error: e2b } = await supabase
    .from('showtimes')
    .select('movie_id')
    .in('movie_id', newIds)
    .gte('show_date', asOfDate)

  if (e2b) throw e2b

  const hasFutureIds = new Set((futureRows ?? []).map((r: Record<string, unknown>) => r.movie_id as string).filter(Boolean))
  const activeNewIds = newIds.filter(id => hasFutureIds.has(id))
  if (activeNewIds.length === 0) { console.log('  오늘 이후 상영 있는 신규 개봉작 없음'); return [] }
  console.log(`  신규 개봉 후보 ${activeNewIds.length}편 (${newIds.length - activeNewIds.length}편 이미 종료)`)

  const { data: movieRows, error: e3 } = await supabase
    .from('movies')
    .select('id, title, original_title, year, poster_url, genre, director, nation, kmdb_id, tmdb_id, rating')
    .in('id', activeNewIds)

  if (e3) throw e3

  // 각 영화의 첫 show_date 구하기
  const { data: firstDateRows, error: e4 } = await supabase
    .from('showtimes')
    .select('movie_id, show_date')
    .in('movie_id', activeNewIds)
    .gte('show_date', weekStart)
    .order('show_date', { ascending: true })

  if (e4) throw e4

  const firstDateMap = new Map<string, string>()
  for (const row of (firstDateRows ?? []) as Record<string, unknown>[]) {
    const mid = row.movie_id as string
    if (!firstDateMap.has(mid)) firstDateMap.set(mid, row.show_date as string)
  }

  const candidates: NewIndieFilmCandidate[] = (movieRows ?? [])
    .map((row: Record<string, unknown>) => ({
      movie: rowToMovie(row),
      firstShowDate: firstDateMap.get(String(row.id)) ?? weekStart,
    }))

  const allResults = await getNewIndieFilms({ getCandidates: async () => candidates }, weekStart, weekEnd)

  await ensureMovieRatings(supabase, allResults.map(r => r.movie))
  const results = filterByRating(allResults)

  const regionsMap = await getRegionsByMovie(supabase, results.map(r => r.movie.id), { gte: asOfDate })
  for (const result of results) {
    result.regions = [...(regionsMap.get(result.movie.id) ?? [])]
  }

  console.log(`  결과: ${results.length}편 (평점 미달 제외 ${allResults.length - results.length}편)`)
  return results
}

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN
const DISCORD_CHANNEL_ID = process.env.DISCORD_REPORT_CHANNEL_ID || process.env.DISCORD_CHANNEL_ID

async function sendCurationPreviewToDiscord(
  returningFilms: Awaited<ReturnType<typeof computeReturningFilms>>,
  newIndieFilms: Awaited<ReturnType<typeof computeNewIndieFilms>>,
) {
  if (!DISCORD_BOT_TOKEN || !DISCORD_CHANNEL_ID) {
    console.log('  Discord 봇 토큰/채널 ID 없음 — Discord 전송 건너뜀')
    return false
  }

  const lines: string[] = []
  if (returningFilms.length > 0) {
    lines.push('**오랜만에 상영하는 영화**')
    returningFilms.forEach((f, i) => {
      lines.push(`${i + 1}. ${f.movie.title} (${f.tagText})`)
    })
  }
  if (newIndieFilms.length > 0) {
    if (lines.length > 0) lines.push('')
    lines.push('**이번 주 새롭게 상영하는 영화**')
    const offset = returningFilms.length
    newIndieFilms.forEach((f, i) => {
      lines.push(`${offset + i + 1}. ${f.movie.title}`)
    })
  }

  if (lines.length === 0) {
    lines.push('표시할 영화 없음')
  }

  lines.push('')
  lines.push('*번호를 보내 일부 제외 가능 (예: 2 4 제외). 없으면 전체 반영.*')

  const total = returningFilms.length + newIndieFilms.length
  const payload = {
    embeds: [{
      title: `🎬 큐레이션 라인업 확인 (총 ${total}편)`,
      description: lines.join('\n').slice(0, 4096),
      color: 0x4A6380,
      footer: { text: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) },
    }],
    components: [{
      type: 1,
      components: [
        { type: 2, style: 3, label: '✅ 전체 반영', custom_id: 'curation_confirm:all' },
        { type: 2, style: 2, label: '✏️ 일부 제외', custom_id: 'curation_exclude_modal' },
      ],
    }],
  }

  const res = await fetch(`https://discord.com/api/v10/channels/${DISCORD_CHANNEL_ID}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    console.error(`  Discord 전송 실패 ${res.status}: ${await res.text().catch(() => '')}`)
    return false
  }

  console.log('  Discord 큐레이션 라인업 전송 완료')
  return true
}

/**
 * 극장별 통상 공개 리드타임(일) — DB RPC(theater_leadtime_p25, supabase/seeds/14_*.sql)에서
 * 집계된 결과만 받는다. showtimes를 통째로 select하면 PostgREST 기본 상한(1000행)에 걸려
 * 임의로 잘린 표본만 보게 되므로 집계 자체를 DB에서 수행한다.
 *
 * RPC 마이그레이션이 아직 안 돼 있어도(배포 순서상 코드가 SQL보다 먼저 나갈 수 있음)
 * 전체 파이프라인이 죽으면 안 되므로 실패 시 빈 맵으로 폴백한다 — 그러면 모든 후보가
 * "리드타임 미상"으로 처리돼 likely로만 잡히는, 이 기능 배포 전과 동일한 안전한 동작이 된다.
 */
async function computeTheaterLeadtimes(supabase: ReturnType<typeof createSupabaseAdminClient>): Promise<Map<string, number | null>> {
  const { data, error } = await supabase.rpc('theater_leadtime_p25', { min_samples: MIN_LEADTIME_SAMPLES })
  if (error) {
    console.error('  theater_leadtime_p25 RPC 실패 — 리드타임 미상으로 폴백 (SQL 마이그레이션 적용됐는지 확인):', error.message)
    return new Map()
  }

  const leadtimeByTheater = new Map<string, number | null>()
  for (const row of (data ?? []) as Array<{ theater_id: string; leadtime_days: number }>) {
    leadtimeByTheater.set(row.theater_id, row.leadtime_days)
  }
  return leadtimeByTheater
}

const KOBIS_NO_MATCH = { matched: false, declining: false } as const

/** KOBIS 교차검증은 어디까지나 보너스 신호라, 응답이 늦으면 기다리지 않고 미매칭으로 취급한다 */
async function withDeadline<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms)
    promise.then((v) => { clearTimeout(timer); resolve(v) }, () => { clearTimeout(timer); resolve(fallback) })
  })
}

/** KOBIS 교차검증 — 실패해도 파이프라인이 죽으면 안 되므로 항상 호출부에서 try/catch로 감싼다.
 *  영화 1편당 최대 6번 순차 요청(검색 1 + 일별 박스오피스 3)이라, 요청당 타임아웃을 다 채우면
 *  후보가 많을 때 전체가 느려진다 — 영화 1편 전체에 하드 데드라인을 걸어 그 이상은 기다리지 않는다. */
async function checkKobisDeclining(title: string, year: number, asOfDate: string): Promise<{ matched: boolean; declining: boolean }> {
  if (!KOBIS_API_KEY) return KOBIS_NO_MATCH

  return withDeadline((async () => {
    const movieCd = await findKobisMovieCd(KOBIS_API_KEY, title, year)
    if (!movieCd) return KOBIS_NO_MATCH

    const targetDates = [3, 2, 1].map((daysAgo) => toKobisDate(addDaysIso(asOfDate, -daysAgo)))
    const trend = await fetchScreenCountTrend(KOBIS_API_KEY, movieCd, targetDates)
    // 일별 박스오피스는 상위 10편만 주므로 독립·예술영화는 순위 밖이라 trend가 비다시피 한다.
    // 이건 "감소 안 함"이 아니라 "데이터 없음"이다 — 매칭 실패와 동일하게 다뤄 리드타임 결과를
    // 그대로 살린다. 실데이터(2개 이상)가 있을 때만 진짜 추세로 취급한다.
    if (trend.length < 2) return KOBIS_NO_MATCH
    return { matched: true, declining: isScreenCountDeclining(trend) }
  })(), 6000, KOBIS_NO_MATCH)
}

/** 동시 실행 수를 제한하며 배열 전체를 처리 — KOBIS API에 순간적으로 몰아치지 않도록 */
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

async function computeLastWeekFilms(supabase: ReturnType<typeof createSupabaseAdminClient>, asOfDate: string): Promise<LastWeekFilm[]> {
  console.log('  이번 주가 마지막 계산 중...')

  const sevenDaysLater = (() => {
    const d = new Date(`${asOfDate}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + 7)
    return d.toISOString().slice(0, 10)
  })()

  // 현재 상영 중인 영화의 max(show_date) 조회 — 극장별 max_date도 함께(리드타임 판정용)
  const { data: rows, error } = await supabase
    .from('showtimes')
    .select('movie_id, theater_id, show_date, movies(id, title, original_title, year, poster_url, genre, director, nation, kmdb_id, tmdb_id, rating), theaters(city)')
    .eq('is_active', true)
    .gte('show_date', asOfDate)
    .lte('show_date', sevenDaysLater)
    .order('show_date', { ascending: true })

  if (error) throw error

  // 영화별 max show_date + movie 정보 + 상영 지역 + 극장별 max_date
  const movieMap = new Map<string, { movie: Movie; maxDate: string; regions: Set<string>; theaterMaxDates: Map<string, string> }>()
  for (const row of (rows ?? []) as Record<string, unknown>[]) {
    const mid = row.movie_id as string
    const theaterId = row.theater_id as string | null
    const date = row.show_date as string
    const movieRaw = row.movies as Record<string, unknown> | null
    const theaterRaw = row.theaters as Record<string, unknown> | null
    if (!mid || !movieRaw) continue
    const existing = movieMap.get(mid)
    if (!existing) {
      movieMap.set(mid, { movie: rowToMovie(movieRaw), maxDate: date, regions: new Set(), theaterMaxDates: new Map() })
    } else if (date > existing.maxDate) {
      existing.maxDate = date
    }
    const entry = movieMap.get(mid)!
    if (theaterRaw) {
      const region = getRegionFromCity(String(theaterRaw.city))
      if (region !== '기타') entry.regions.add(region)
    }
    if (theaterId) {
      const theaterMax = entry.theaterMaxDates.get(theaterId)
      if (!theaterMax || date > theaterMax) entry.theaterMaxDates.set(theaterId, date)
    }
  }

  // max(show_date) <= sevenDaysLater 이고 asOfDate 이후에도 상영이 없는(= 이후 미래 상영 없는) 영화만 남김
  // 즉 max(show_date)가 오늘~7일 사이인 영화
  const { data: futureRows, error: fe } = await supabase
    .from('showtimes')
    .select('movie_id')
    .eq('is_active', true)
    .gt('show_date', sevenDaysLater)

  if (fe) throw fe

  const hasFutureIds = new Set((futureRows ?? []).map((r: Record<string, unknown>) => r.movie_id as string).filter(Boolean))

  const leadtimeByTheater = await computeTheaterLeadtimes(supabase)

  // 1단계(리드타임) 판정까지는 동기 계산이라 전부 먼저 끝내둔다
  const candidates = [...movieMap.entries()]
    .filter(([mid]) => !hasFutureIds.has(mid))   // 7일 이후에도 상영 있음 → 제외
    .map(([, { movie, maxDate, regions, theaterMaxDates }]) => {
      const theaterMaxDateList = [...theaterMaxDates.entries()].map(([theaterId, maxShowDate]) => ({ theaterId, maxShowDate }))
      return { movie, maxDate, regions, leadtimeConfirmed: isLeadtimeConfirmed(theaterMaxDateList, leadtimeByTheater, asOfDate) }
    })

  // 2단계(KOBIS)는 리드타임 통과 후보만, 그마저도 동시에 몇 개씩 처리 — 순차로 하면 후보 많을 때 수 분씩 걸린다
  const KOBIS_CONCURRENCY = 4
  const kobisResults = await mapWithConcurrency(candidates, KOBIS_CONCURRENCY, async (c) => {
    if (!c.leadtimeConfirmed) return KOBIS_NO_MATCH
    try {
      return await checkKobisDeclining(c.movie.title, c.movie.year, asOfDate)
    } catch (e) {
      console.error(`  KOBIS 교차검증 실패 (${c.movie.title}), 리드타임 결과로 폴백:`, e instanceof Error ? e.message : e)
      return KOBIS_NO_MATCH
    }
  })

  const allResults: LastWeekFilm[] = candidates.map((c, i) => {
    const { matched, declining } = kobisResults[i]
    const confidence = combineConfidence(c.leadtimeConfirmed, matched, declining)
    const diff = Math.round(
      (new Date(`${c.maxDate}T00:00:00Z`).getTime() - new Date(`${asOfDate}T00:00:00Z`).getTime()) / 86400000
    )
    return {
      movie: c.movie,
      maxShowDate: c.maxDate,
      daysLeft: diff,
      badgeText: getLastWeekBadgeText(diff, confidence),
      confidence,
      regions: [...c.regions],
    }
  })

  await ensureMovieRatings(supabase, allResults.map(r => r.movie))
  const results = filterByRating(allResults)

  // 가장 급한 순 (마지막 날 빠른 순)
  results.sort((a, b) => a.maxShowDate.localeCompare(b.maxShowDate))
  const confirmedCount = results.filter((r) => r.confidence === 'confirmed').length
  console.log(`  결과: ${results.length}편 (평점 미달 제외 ${allResults.length - results.length}편, confirmed ${confirmedCount}편/likely ${results.length - confirmedCount}편)`)
  return results
}

async function computeSoloTheaterFilms(supabase: ReturnType<typeof createSupabaseAdminClient>, asOfDate: string): Promise<SoloTheaterFilmsByRegion> {
  console.log('  지역별 단 한 곳 계산 중...')

  const sevenDaysLater = (() => {
    const d = new Date(`${asOfDate}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + 7)
    return d.toISOString().slice(0, 10)
  })()

  const { data: rows, error } = await supabase
    .from('showtimes')
    .select(`
      movie_id,
      theater_id,
      movies(id, title, original_title, year, poster_url, genre, director, nation, kmdb_id, tmdb_id, rating),
      theaters(id, name, city)
    `)
    .eq('is_active', true)
    .gte('show_date', asOfDate)
    .lte('show_date', sevenDaysLater)

  if (error) throw error

  // movie_id → { theaterIds: Set, movie, theaters: Map<id, {name,city}> }
  const movieInfo = new Map<string, {
    movie: Movie
    theaters: Map<string, { name: string; city: string }>
  }>()

  for (const row of (rows ?? []) as Record<string, unknown>[]) {
    const mid = row.movie_id as string
    const tid = row.theater_id as string
    const movieRaw = row.movies as Record<string, unknown> | null
    const theaterRaw = row.theaters as Record<string, unknown> | null
    if (!mid || !tid || !movieRaw || !theaterRaw) continue

    if (!movieInfo.has(mid)) {
      movieInfo.set(mid, { movie: rowToMovie(movieRaw), theaters: new Map() })
    }
    const info = movieInfo.get(mid)!
    if (!info.theaters.has(tid)) {
      info.theaters.set(tid, { name: String(theaterRaw.name), city: String(theaterRaw.city) })
    }
  }

  // 지역별로 극장 수 = 1인 영화 수집
  const byRegion: SoloTheaterFilmsByRegion = {}

  for (const { movie, theaters } of movieInfo.values()) {
    // theater → region 그룹화
    const regionTheaters = new Map<string, { id: string; name: string; city: string }>()
    for (const [tid, { name, city }] of theaters.entries()) {
      const region = getRegionFromCity(city)
      if (region === '기타') continue
      if (!regionTheaters.has(region)) {
        regionTheaters.set(region, { id: tid, name, city })
      } else {
        // 해당 지역에 이미 다른 극장 있음 → 단 한 곳 아님
        regionTheaters.set(region, { id: '__multi__', name: '', city: '' })
      }
    }

    for (const [region, theater] of regionTheaters.entries()) {
      if (theater.id === '__multi__') continue
      if (!byRegion[region]) byRegion[region] = []
      byRegion[region].push({
        movie,
        theaterId: theater.id,
        theaterName: theater.name,
        theaterCity: theater.city,
      } satisfies SoloTheaterFilm)
    }
  }

  const regionCount = Object.keys(byRegion).reduce((s, k) => s + byRegion[k].length, 0)
  console.log(`  결과: ${Object.keys(byRegion).length}개 지역, 총 ${regionCount}편`)
  return byRegion
}

async function main() {
  console.log('큐레이션 스냅샷 계산 시작')
  const supabase = createSupabaseAdminClient()
  const asOfDate = formatLocalDate(new Date())
  console.log(`날짜: ${asOfDate}`)

  const [returningFilms, newIndieFilms, lastWeekFilms, soloTheaterFilms] = await Promise.all([
    computeReturningFilms(supabase, asOfDate),
    computeNewIndieFilms(supabase, asOfDate),
    computeLastWeekFilms(supabase, asOfDate),
    computeSoloTheaterFilms(supabase, asOfDate),
  ])

  // DRY_RUN=1: DB 쓰기·Discord 전송 없이 판정 결과만 확인 (리드타임/KOBIS 튜닝 검증용)
  if (process.env.DRY_RUN === '1') {
    console.log('\n=== DRY RUN — 쓰기·Discord 전송 없음 ===')
    console.log(`이번 주가 마지막: ${lastWeekFilms.length}편`)
    for (const f of lastWeekFilms) {
      console.log(`  [${f.confidence}] ${f.movie.title} — ${f.badgeText} (max: ${f.maxShowDate})`)
    }
    return
  }

  // Discord 봇이 설정되어 있으면 pending에 저장 후 컨펌 대기 (신규 개봉 라인업만 검수 대상)
  const discordSent = await sendCurationPreviewToDiscord(returningFilms, newIndieFilms)

  if (discordSent) {
    const { error } = await supabase
      .from('curation_pending')
      .upsert({
        id: 1,
        returning_films: returningFilms,
        new_indie_films: newIndieFilms,
        last_week_films: lastWeekFilms,
        solo_theater_films: soloTheaterFilms,
        computed_at: new Date().toISOString(),
      })
    if (error) throw error
    console.log(`대기 중 — 오랜만에 상영 ${returningFilms.length}편, 이번 주 신규 ${newIndieFilms.length}편 Discord 컨펌 대기`)

    // 즉시 반영 가능한 섹션은 바로 cache에도 반영 (Discord 컨펌과 무관)
    const { error: cacheErr } = await supabase
      .from('curation_cache')
      .update({ last_week_films: lastWeekFilms, solo_theater_films: soloTheaterFilms, computed_at: new Date().toISOString() })
      .eq('id', 1)
    if (cacheErr) throw cacheErr
    console.log(`즉시 반영 — 이번 주가 마지막 ${lastWeekFilms.length}편, 단 한 곳 ${Object.keys(soloTheaterFilms).length}개 지역`)
  } else {
    // Discord 미설정 시 바로 cache에 저장 (기존 동작)
    const { error } = await supabase
      .from('curation_cache')
      .upsert({
        id: 1,
        returning_films: returningFilms,
        new_indie_films: newIndieFilms,
        last_week_films: lastWeekFilms,
        solo_theater_films: soloTheaterFilms,
        computed_at: new Date().toISOString(),
      })
    if (error) throw error
    console.log(`완료 — 오랜만에 상영 ${returningFilms.length}편, 이번 주 신규 ${newIndieFilms.length}편, 이번 주가 마지막 ${lastWeekFilms.length}편, 단 한 곳 ${Object.keys(soloTheaterFilms).length}개 지역 저장`)
  }
}

main().catch((err) => {
  console.error('오류:', err)
  process.exit(1)
})
