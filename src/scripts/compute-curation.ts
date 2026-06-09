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
import { clusterDatesToRuns, getReturningFilms } from '@/lib/curation/getReturningFilms'
import { getNewIndieFilms } from '@/lib/curation/getNewIndieFilms'
import type { Movie } from '@/types/api'
import type { NewIndieFilmCandidate, ReturningFilmCandidate } from '@/lib/curation/types'

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addMonthsToIso(dateStr: string, months: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  const shifted = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, d.getUTCDate()))
  return shifted.toISOString().slice(0, 10)
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

function rowToMovie(movieRaw: Record<string, unknown>): Movie {
  return {
    id: String(movieRaw.id),
    title: String(movieRaw.title),
    originalTitle: movieRaw.original_title != null ? String(movieRaw.original_title) : undefined,
    year: Number(movieRaw.year ?? 2000),
    posterUrl: movieRaw.poster_url != null ? String(movieRaw.poster_url) : undefined,
    genre: (movieRaw.genre as string[]) ?? [],
    director: (movieRaw.director as string[]) ?? [],
    nation: movieRaw.nation != null ? String(movieRaw.nation) : undefined,
    kmdbId: movieRaw.kmdb_id != null ? String(movieRaw.kmdb_id) : undefined,
    tmdbId: movieRaw.tmdb_id != null ? Number(movieRaw.tmdb_id) : undefined,
    rating: movieRaw.rating != null ? Number(movieRaw.rating) : undefined,
  }
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

  const results = await getReturningFilms({ getCandidates: async () => candidates }, asOfDate)
  console.log(`  결과: ${results.length}편`)
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
  console.log(`  신규 개봉 후보 ${newIds.length}편`)

  const { data: movieRows, error: e3 } = await supabase
    .from('movies')
    .select('id, title, original_title, year, poster_url, genre, director, nation, kmdb_id, tmdb_id, rating')
    .in('id', newIds)

  if (e3) throw e3

  // 각 영화의 첫 show_date 구하기
  const { data: firstDateRows, error: e4 } = await supabase
    .from('showtimes')
    .select('movie_id, show_date')
    .in('movie_id', newIds)
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

  const results = await getNewIndieFilms({ getCandidates: async () => candidates }, weekStart, weekEnd)
  console.log(`  결과: ${results.length}편`)
  return results
}

async function main() {
  console.log('큐레이션 스냅샷 계산 시작')
  const supabase = createSupabaseAdminClient()
  const asOfDate = todayIso()
  console.log(`날짜: ${asOfDate}`)

  const [returningFilms, newIndieFilms] = await Promise.all([
    computeReturningFilms(supabase, asOfDate),
    computeNewIndieFilms(supabase, asOfDate),
  ])

  const { error } = await supabase
    .from('curation_cache')
    .upsert({ id: 1, returning_films: returningFilms, new_indie_films: newIndieFilms, computed_at: new Date().toISOString() })

  if (error) throw error

  console.log(`완료 — 오랜만에 상영 ${returningFilms.length}편, 이번 주 신규 ${newIndieFilms.length}편 저장`)
}

main().catch((err) => {
  console.error('오류:', err)
  process.exit(1)
})
