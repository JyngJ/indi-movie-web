/**
 * 배치(크론)용 알림 저장소 — service role. RLS를 우회하므로 스크립트에서만 쓴다.
 *
 * 상영 사실은 showtimes를 영화×극장으로 눌러 담는다. 회차 단위로 보면 같은 상영이
 * 시간마다 여러 건이라 알림이 폭주한다.
 */

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { LastWeekFilm } from '@/lib/curation/types'
import { getRegionFromCity } from '@/lib/regions'
import type { NotificationBatchRepository } from './repository'
import {
  DEFAULT_PREFS,
  type DeliveryRecord, type FavoriteRef, type LastWeekFact, type NotificationEvent,
  type NotificationPrefs, type ScreeningFact, type StoredNotificationEvent,
} from './types'

const hhmm = (t: string) => t.slice(0, 5)

/** Supabase는 한 번에 1000행만 준다 — 페이지네이션으로 전부 긁는다 */
async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  pageSize = 1000,
): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await page(from, from + pageSize - 1)
    if (error) throw error
    const rows = data ?? []
    out.push(...rows)
    if (rows.length < pageSize) break
  }
  return out
}

export function createSupabaseNotificationBatchRepository(): NotificationBatchRepository {
  const supabase = createSupabaseAdminClient()

  return {
    async listAllFavorites() {
      const rows = await fetchAll<{ user_id: string; item_type: FavoriteRef['type']; item_id: string }>(
        (from, to) => supabase.from('favorites').select('user_id, item_type, item_id').range(from, to) as never,
      )
      return rows.map((r) => ({ userId: r.user_id, type: r.item_type, id: r.item_id }))
    },

    async listPrefs(userIds) {
      const out = new Map<string, NotificationPrefs>()
      for (const id of userIds) out.set(id, { userId: id, ...DEFAULT_PREFS })
      if (userIds.length === 0) return out

      const { data, error } = await supabase
        .from('notification_prefs')
        .select('user_id, new_screening, last_week, weekly_digest, quiet_start, quiet_end, channel, region_ids')
        .in('user_id', userIds)
      if (error) throw error

      for (const r of data ?? []) {
        out.set(r.user_id, {
          userId: r.user_id,
          newScreening: r.new_screening,
          lastWeek: r.last_week,
          weeklyDigest: r.weekly_digest,
          quietStart: hhmm(r.quiet_start),
          quietEnd: hhmm(r.quiet_end),
          channel: r.channel,
          regionIds: r.region_ids ?? [],
        })
      }
      return out
    },

    async listScreeningFacts(fromDate, toDate) {
      const rows = await fetchAll<{
        movie_id: string
        theater_id: string
        show_date: string
        movies: { title: string; director: string[] | null; poster_url: string | null } | null
        theaters: { name: string; city: string | null } | null
      }>((from, to) => supabase
        .from('showtimes')
        .select('movie_id, theater_id, show_date, movies(title, director, poster_url), theaters(name, city)')
        .eq('is_active', true)
        .gte('show_date', fromDate)
        .lte('show_date', toDate)
        .range(from, to) as never,
      )

      // 영화×극장으로 접기 — 회차 수만큼 알림이 나가면 안 된다
      const byPair = new Map<string, ScreeningFact>()
      for (const r of rows) {
        if (!r.movies || !r.theaters) continue
        const key = `${r.movie_id}|${r.theater_id}`
        let fact = byPair.get(key)
        if (!fact) {
          fact = {
            movieId: r.movie_id,
            movieTitle: r.movies.title,
            directors: r.movies.director ?? [],
            posterUrl: r.movies.poster_url ?? undefined,
            theaterId: r.theater_id,
            theaterName: r.theaters.name,
            regionId: getRegionFromCity(r.theaters.city ?? ''),
            dates: [],
          }
          byPair.set(key, fact)
        }
        if (!fact.dates.includes(r.show_date)) fact.dates.push(r.show_date)
      }
      for (const f of byPair.values()) f.dates.sort()
      return [...byPair.values()]
    },

    async listLastWeekFacts() {
      // 막바지 판정은 crawl:curation이 이미 계산해 curation_cache에 넣어둔다 — 재계산하지 않는다
      const { data, error } = await supabase
        .from('curation_cache')
        .select('last_week_films')
        .eq('id', 1)
        .maybeSingle()
      if (error) throw error

      const films = (data?.last_week_films ?? []) as LastWeekFilm[]
      return films.map<LastWeekFact>((f) => ({
        movieId: f.movie.id,
        daysLeft: f.daysLeft,
        // 레거시 캐시엔 confidence가 없다 — 없으면 추정으로 본다
        confidence: f.confidence ?? 'likely',
      }))
    },

    async listSeenDedupeKeys(userIds) {
      const out = new Map<string, Set<string>>()
      for (const id of userIds) out.set(id, new Set())
      if (userIds.length === 0) return out

      // 원장에서 읽는다 — 소식 1건이 극장 키 여러 개를 덮으므로 events만 봐선 부족하다
      const rows = await fetchAll<{ user_id: string; dedupe_key: string }>(
        (from, to) => supabase
          .from('notification_seen_keys')
          .select('user_id, dedupe_key')
          .in('user_id', userIds)
          .range(from, to) as never,
      )
      for (const r of rows) {
        let set = out.get(r.user_id)
        if (!set) { set = new Set(); out.set(r.user_id, set) }
        set.add(r.dedupe_key)
      }
      return out
    },

    async recordSeenKeys(userId, keys) {
      if (keys.length === 0) return
      // 1000개씩 끊어 넣는다 — 첫 시드는 사용자당 수천 건이 될 수 있다
      for (let i = 0; i < keys.length; i += 1000) {
        const { error } = await supabase
          .from('notification_seen_keys')
          .upsert(keys.slice(i, i + 1000).map((dedupe_key) => ({ user_id: userId, dedupe_key })),
            { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true })
        if (error) throw error
      }
    },

    async insertEvents(events) {
      if (events.length === 0) return []
      const { data, error } = await supabase
        .from('notification_events')
        .upsert(events.map((e) => ({
          user_id: e.userId,
          kind: e.kind,
          subject_type: e.subjectType,
          subject_id: e.subjectId,
          movie_id: e.movieId ?? null,
          theater_id: e.theaterId ?? null,
          payload: e.payload,
          dedupe_key: e.dedupeKey,
        })), { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true })
        .select('id, user_id, kind, subject_type, subject_id, movie_id, theater_id, payload, dedupe_key, created_at, read_at')
      if (error) throw error

      // 이벤트가 덮은 모든 키를 원장에 남긴다 — 이게 빠지면 묶인 극장들이 다음 실행에 재알림된다
      const keysByUser = new Map<string, string[]>()
      for (const e of events) {
        const list = keysByUser.get(e.userId) ?? []
        list.push(...e.coveredKeys)
        keysByUser.set(e.userId, list)
      }
      for (const [userId, keys] of keysByUser) {
        await this.recordSeenKeys(userId, keys)
      }

      return (data ?? []).map<StoredNotificationEvent>((r) => ({
        id: r.id,
        userId: r.user_id,
        kind: r.kind,
        subjectType: r.subject_type,
        subjectId: r.subject_id,
        movieId: r.movie_id ?? undefined,
        theaterId: r.theater_id ?? undefined,
        payload: r.payload,
        dedupeKey: r.dedupe_key,
        createdAt: r.created_at,
        readAt: r.read_at,
      }))
    },

    async insertDelivery(record: DeliveryRecord) {
      const { error } = await supabase.from('notification_deliveries').insert({
        user_id: record.userId,
        event_ids: record.eventIds,
        channel: record.channel,
        status: record.status,
        skip_reason: record.skipReason ?? null,
        attempts: record.attempts,
        error: record.error ?? null,
        sent_at: record.status === 'sent' ? new Date().toISOString() : null,
      })
      if (error) throw error
    },
  }
}
