import { captureEmailMetric } from './analytics'
import { decorateDigest } from './tracking'
import { randomUUID } from 'node:crypto'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseNotificationBatchRepository } from '@/lib/notifications/supabaseNotificationBatchRepository'
import { getRegionFromCity } from '@/lib/regions'
import type { ScreeningFact } from '@/lib/notifications/types'
import { scheduleSlot, type EmailSubscription } from './domain'
import { renderDigest, selectDigestItems, selectWeeklyRecommendations, type DigestEvent } from './digest'
import { gmailConfigured, MailSendError, sendGmail, type EmailMessage } from './gmail'
import { getSubscription, siteOrigin } from './server'
import { signManagementToken } from './tokens'
async function all<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const output: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await query(from, from + 999)
    if (error) throw error
    output.push(...data ?? [])
    if (!data || data.length < 1000) return output
  }
}
async function currentScreenings(now: Date, slot: string): Promise<ScreeningFact[]> {
  const db = createSupabaseAdminClient()
  const end = new Date(`${slot}T00:00:00Z`); end.setUTCDate(end.getUTCDate() + 14)
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(now)
  type Row = { movie_id: string; theater_id: string; show_date: string; show_time: string; movies: { title: string; director: string[] | null; poster_url: string | null }; theaters: { name: string; city: string | null } }
  const rows = await all<Row>((from, to) => db.from('showtimes').select('movie_id,theater_id,show_date,show_time,movies(title,director,poster_url),theaters(name,city)').eq('is_active', true).gte('show_date', slot).lte('show_date', end.toISOString().slice(0, 10)).order('id').range(from, to) as never)
  const pairs = new Map<string, ScreeningFact>()
  for (const row of rows) {
    if (!row.movies || !row.theaters || (row.show_date === slot && row.show_time <= time)) continue
    const key = `${row.movie_id}:${row.theater_id}`
    const fact = pairs.get(key) ?? { movieId: row.movie_id, movieTitle: row.movies.title, posterUrl: row.movies.poster_url ?? undefined, directors: row.movies.director ?? [], theaterId: row.theater_id, theaterName: row.theaters.name, regionId: getRegionFromCity(row.theaters.city ?? ''), dates: [] }
    if (!fact.dates.includes(row.show_date)) fact.dates.push(row.show_date)
    pairs.set(key, fact)
  }
  return [...pairs.values()]
}
export async function runEmailBatch({ now = new Date(), send = false }: { now?: Date; send?: boolean } = {}) {
  const slot = scheduleSlot(now)
  const result = { considered: 0, ready: 0, sent: 0, failed: 0, unknown: 0 }
  if (!slot) return result
  if (send && (process.env.EMAIL_NOTIFICATION_DELIVERY_ENABLED !== 'true' || !gmailConfigured())) throw new Error('Email delivery is disabled or not configured')
  const db = createSupabaseAdminClient()
  const repo = createSupabaseNotificationBatchRepository()
  const subscriptions = await all<EmailSubscription>((from, to) => db.from('email_notification_subscriptions').select('user_id,email,status,prompt_dismissed,revision,subscribed_at,sent_count,frequency_feedback').eq('status', 'active').order('user_id').range(from, to))
  const [favorites, screenings, lastWeek] = await Promise.all([repo.listAllFavorites(), currentScreenings(now, slot), repo.listLastWeekFacts()])
  const origin = siteOrigin()
  for (const original of subscriptions) {
    result.considered++
    // 주소 변경·해지·삭제 여부를 준비 시점에 다시 확인한다.
    const subscription = await getSubscription(original.user_id)
    if (!subscription || subscription.status !== 'active' || !subscription.email || !subscription.subscribed_at) continue
    const prefs = (await repo.listPrefs([subscription.user_id])).get(subscription.user_id)!
    const sent = await all<{ event_ids: string[] }>((from, to) => db.from('email_notification_deliveries').select('event_ids').eq('user_id', subscription.user_id).eq('status', 'sent').order('id').range(from, to))
    const sentIds = new Set(sent.flatMap(d => d.event_ids))
    const events = await all<DigestEvent>((from, to) => db.from('notification_events').select('id,kind,subject_type,subject_id,movie_id,theater_id,payload').eq('user_id', subscription.user_id).in('kind', ['new_screening', 'last_week']).gte('created_at', subscription.subscribed_at!).lte('created_at', now.toISOString()).order('created_at').order('id').range(from, to))
    const items = selectDigestItems({ events: events.filter(e => !sentIds.has(e.id)), favorites: favorites.filter(f => f.userId === subscription.user_id), prefs, screenings, lastWeek, today: slot })
    if (!items.length) continue
    result.ready++
    if (!send) continue
    const expires = now.getTime() + 365 * 86400000
    const unsubscribeToken = signManagementToken({ userId: subscription.user_id, revision: subscription.revision, purpose: 'unsubscribe', expires: Number.MAX_SAFE_INTEGER })
    const frequencyToken = signManagementToken({ userId: subscription.user_id, revision: subscription.revision, purpose: 'frequency', expires })
    const unsubscribeUrl = `${origin}/email/manage?action=unsubscribe&token=${unsubscribeToken}`
    const recommendations = selectWeeklyRecommendations({ screenings, favorites: favorites.filter(f => f.userId === subscription.user_id), prefs, items, today: slot })
    const content = renderDigest({ items, recommendations, origin, unsubscribeUrl, frequencyUrl: `${origin}/email/manage?action=frequency&token=${frequencyToken}`, sentCount: subscription.sent_count })
    const id = randomUUID()
    const message: EmailMessage = { ...content, to: subscription.email, messageId: id, unsubscribeUrl: `${origin}/api/email-notifications/manage?token=${unsubscribeToken}` }
    const { error: insertError } = await db.from('email_notification_deliveries').upsert({ id, user_id: subscription.user_id, revision: subscription.revision, slot, event_ids: items.flatMap(i => i.eventIds), message }, { onConflict: 'user_id,revision,slot', ignoreDuplicates: true })
    if (insertError) throw insertError
    const { data: job, error: jobError } = await db.from('email_notification_deliveries').select('id,status,event_ids,created_at').eq('user_id', subscription.user_id).eq('revision', subscription.revision).eq('slot', slot).single()
    if (jobError) throw jobError
    if (!['pending', 'failed'].includes(job.status)) continue
    const { data: claimed, error: claimError } = await db.rpc('claim_email_notification_delivery', { p_id: job.id })
    if (claimError) throw claimError
    if (!claimed) continue
    try {
      // 안전한 재시도에서도 현재 유효한 소식·설정으로 다시 구성한다.
      const trackedMessage = decorateDigest({ ...message, messageId: job.id }, origin, job.id, slot)
      const { error: refreshError } = await db.from('email_notification_deliveries').update({ message: trackedMessage, event_ids: items.flatMap(i => i.eventIds) }).eq('id', job.id).eq('status', 'sending')
      if (refreshError) throw refreshError

      const fresh = await getSubscription(subscription.user_id)
      if (!fresh || fresh.status !== 'active' || fresh.revision !== subscription.revision) {
        const { error } = await db.from('email_notification_deliveries').update({ status: 'skipped' }).eq('id', job.id)
        if (error) throw error
        continue
      }
      const providerId = await sendGmail(trackedMessage)
      const { data: completed, error } = await db.rpc('complete_email_notification_delivery', { p_id: job.id, p_message_id: providerId })
      if (error || !completed) throw new MailSendError(true)
      result.sent++
      // 통계 실패는 발송 성공을 되돌리거나 메일 재발송을 유발하지 않는다.
      await captureEmailMetric('sent', { id: job.id, user_id: subscription.user_id, slot, sent_at: new Date().toISOString() })
    } catch (error) {
      // 응답이 없거나 성공 기록에 실패하면 중복 발송을 막기 위해 수동 확인한다.
      const uncertain = !(error instanceof MailSendError) || error.uncertain
      const { error: saveError } = await db.from('email_notification_deliveries').update({ status: uncertain ? 'unknown' : 'failed' }).eq('id', job.id).eq('status', 'sending')
      if (saveError) throw saveError
      if (uncertain) result.unknown++; else result.failed++
    }
  }
  return result
}
