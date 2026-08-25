/**
 * 브라우저용 알림 저장소 — RLS로 본인 행만 보인다.
 * 설정 행은 처음엔 없을 수 있어서(기본값 사용) getPrefs는 없으면 기본값을 돌려주고,
 * savePrefs가 upsert로 만든다.
 */

import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import type { NotificationClientRepository } from './repository'
import { DEFAULT_PREFS, type NotificationPayload, type NotificationPrefs, type StoredNotificationEvent } from './types'

interface EventRow {
  id: string
  kind: StoredNotificationEvent['kind']
  subject_type: StoredNotificationEvent['subjectType']
  subject_id: string
  movie_id: string | null
  theater_id: string | null
  payload: NotificationPayload
  dedupe_key: string
  created_at: string
  read_at: string | null
}

interface PrefsRow {
  user_id: string
  new_screening: boolean
  last_week: boolean
  weekly_digest: boolean
  quiet_start: string
  quiet_end: string
  channel: 'kakao' | 'none'
  region_ids: string[] | null
}

/** DB의 TIME은 "21:00:00"으로 오는데 UI·판정은 "21:00"만 쓴다 */
const hhmm = (t: string) => t.slice(0, 5)

function rowToPrefs(r: PrefsRow): NotificationPrefs {
  return {
    userId: r.user_id,
    newScreening: r.new_screening,
    lastWeek: r.last_week,
    weeklyDigest: r.weekly_digest,
    quietStart: hhmm(r.quiet_start),
    quietEnd: hhmm(r.quiet_end),
    channel: r.channel,
    regionIds: r.region_ids ?? [],
  }
}

export function createSupabaseNotificationsRepository(): NotificationClientRepository {
  const supabase = createSupabaseBrowserClient()

  const requireUserId = async () => {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) throw new Error('not authenticated')
    return data.user.id
  }

  return {
    async listEvents(limit) {
      const { data, error } = await supabase
        .from('notification_events')
        .select('id, kind, subject_type, subject_id, movie_id, theater_id, payload, dedupe_key, created_at, read_at')
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return ((data ?? []) as EventRow[]).map((r) => ({
        id: r.id,
        userId: '',                      // RLS로 본인 것만 오므로 클라이언트에선 안 쓴다
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

    async markAllRead() {
      const userId = await requireUserId()
      const { error } = await supabase
        .from('notification_events')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('read_at', null)
      if (error) throw error
    },

    async getPrefs() {
      const userId = await requireUserId()
      const { data, error } = await supabase
        .from('notification_prefs')
        .select('user_id, new_screening, last_week, weekly_digest, quiet_start, quiet_end, channel, region_ids')
        .eq('user_id', userId)
        .maybeSingle()
      if (error) throw error
      if (!data) return { userId, ...DEFAULT_PREFS }
      return rowToPrefs(data as PrefsRow)
    },

    async savePrefs(patch) {
      const userId = await requireUserId()
      const current = await this.getPrefs()
      const next = { ...current, ...patch }
      const { data, error } = await supabase
        .from('notification_prefs')
        .upsert({
          user_id: userId,
          new_screening: next.newScreening,
          last_week: next.lastWeek,
          weekly_digest: next.weeklyDigest,
          quiet_start: next.quietStart,
          quiet_end: next.quietEnd,
          channel: next.channel,
          region_ids: next.regionIds,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        .select('user_id, new_screening, last_week, weekly_digest, quiet_start, quiet_end, channel, region_ids')
        .single()
      if (error) throw error
      return rowToPrefs(data as PrefsRow)
    },
  }
}
