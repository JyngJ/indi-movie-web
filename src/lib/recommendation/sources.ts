/**
 * 추천 학습용 데이터 어댑터 — PostHog 행동 기록과 Supabase 영화 정보·상영 일정을 읽어
 * 정규화된 값(Interaction·MovieFeatures)으로 돌려준다. 학습·평가 로직은 이 파일을 모른다.
 */
import { hogql, POSTHOG_EXCLUDE_INTERNAL, POSTHOG_PROD_HOST } from '@/lib/analytics/posthogQuery'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { INTERACTION_WEIGHT, type InteractionKind, type MovieFeatures } from './types'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/** 사람·영화·신호·날짜별 횟수. 날짜가 있어야 시간으로 나눠 평가할 수 있다. */
export interface DailySignal { user: string; movieId: string; kind: InteractionKind; day: string; count: number }

/**
 * 운영 도메인·내부 사용자 제외. 관심 등록은 영화만.
 * 개인 API 키로는 OFFSET을 못 써서 7일씩 끊어 읽는다(구간마다 결과 한도 50,000행).
 */
export async function fetchDailySignals(days: number): Promise<DailySignal[]> {
  const out: DailySignal[] = []
  const limit = 50000
  for (let end = 0; end < days; end += 7) {
    const start = Math.min(days, end + 7)
    const rows = await hogql(`
      select toString(person_id), movie, kind, toString(toDate(toTimeZone(timestamp, 'Asia/Seoul'))) as day, count()
      from (
        select person_id, timestamp,
          multiIf(event = 'movie detail viewed', 'view', event = 'showtime selected', 'showtime', event = 'booking clicked', 'booking', 'favorite') as kind,
          toString(if(event = 'favorite added', properties.fav_id, properties.movie_id)) as movie
        from events
        where event in ('movie detail viewed', 'showtime selected', 'booking clicked', 'favorite added')
          and (event != 'favorite added' or properties.fav_type = 'movie')
          and properties.$host = '${POSTHOG_PROD_HOST}'
          and timestamp >= now() - interval ${start} day and timestamp < now() - interval ${end} day
          and ${POSTHOG_EXCLUDE_INTERNAL}
      )
      group by 1, 2, 3, 4 limit ${limit}`)
    if (rows.length >= limit) throw new Error('PostHog result hit the row limit; shorten the window')
    for (const [user, movieId, kind, day, count] of rows as [string, string, InteractionKind, string, number][]) {
      if (UUID.test(movieId) && kind in INTERACTION_WEIGHT) out.push({ user, movieId, kind, day, count: Number(count) })
    }
  }
  return out
}

export async function fetchMovieFeatures(ids: string[]): Promise<Map<string, MovieFeatures>> {
  const db = createSupabaseAdminClient()
  const map = new Map<string, MovieFeatures>()
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await db.from('movies').select('id,director,genre,nation,year').in('id', ids.slice(i, i + 200))
    if (error) throw error
    for (const m of data ?? []) map.set(m.id, { id: m.id, directors: m.director ?? [], genres: m.genre ?? [], nation: m.nation ?? null, year: m.year ?? null })
  }
  return map
}

/** 기간 안에 상영 일정이 있는 영화 */
export async function fetchScreeningMovieIds(from: string, to: string): Promise<string[]> {
  const db = createSupabaseAdminClient()
  const ids = new Set<string>()
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from('showtimes').select('movie_id').gte('show_date', from).lte('show_date', to).order('id').range(offset, offset + 999)
    if (error) throw error
    for (const r of data ?? []) if (r.movie_id) ids.add(r.movie_id)
    if (!data || data.length < 1000) return [...ids]
  }
}
