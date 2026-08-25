/**
 * 알림 유스케이스 — 판정(rules) 결과를 저장하고, 사용자별로 묶어 발송 이력을 남긴다.
 *
 * 지금은 실제 카톡 전송을 하지 않는다(P3-b 범위). sender를 안 넘기면 모든 묶음이
 * skipped('sending_disabled')로 기록되고, 소식 탭에는 정상적으로 쌓인다.
 * 나중에 sender만 끼우면 그대로 발송이 켜진다.
 */

import type { NotificationBatchRepository } from './repository'
import {
  buildLastWeekEvents, buildNewScreeningEvents, isQuietHour, summarizeForMessage,
} from './rules'
import type { NotificationEvent, StoredNotificationEvent } from './types'

/** 카톡 발송 어댑터 — 인프라. 없으면 발송을 건너뛴다 */
export interface NotificationSender {
  /** 실패 시 throw. 토큰 없음/스코프 미동의는 skip 사유로 구분해 돌려준다 */
  send(input: { userId: string; text: string; eventCount: number }): Promise<
    { ok: true } | { ok: false; skipReason: 'no_kakao_token' | 'scope_missing' }
  >
}

export interface DispatchOptions {
  /** 상영 사실 조회 범위 — 오늘부터 며칠 앞까지 */
  lookaheadDays?: number
  /** KST 현재 시각 "HH:MM" — 조용한 시간 판정용 */
  nowHhmm: string
  /** 오늘 날짜 ISO */
  today: string
  sender?: NotificationSender
}

export interface DispatchResult {
  usersConsidered: number
  eventsCreated: number
  deliveriesSent: number
  deliveriesSkipped: number
  deliveriesFailed: number
  skipReasons: Record<string, number>
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export async function runNotificationDispatch(
  repo: NotificationBatchRepository,
  opts: DispatchOptions,
): Promise<DispatchResult> {
  const { today, nowHhmm, lookaheadDays = 14, sender } = opts

  const favorites = await repo.listAllFavorites()
  const userIds = [...new Set(favorites.map((f) => f.userId))]

  const result: DispatchResult = {
    usersConsidered: userIds.length,
    eventsCreated: 0,
    deliveriesSent: 0,
    deliveriesSkipped: 0,
    deliveriesFailed: 0,
    skipReasons: {},
  }
  if (userIds.length === 0) return result

  const [prefsByUser, screenings, lastWeekFacts, seenKeysByUser] = await Promise.all([
    repo.listPrefs(userIds),
    repo.listScreeningFacts(today, addDays(today, lookaheadDays)),
    repo.listLastWeekFacts(),
    repo.listSeenDedupeKeys(userIds),
  ])

  const events: NotificationEvent[] = [
    ...buildNewScreeningEvents({ favorites, screenings, prefsByUser, seenKeysByUser }),
    ...buildLastWeekEvents({ favorites, screenings, lastWeekFacts, prefsByUser, seenKeysByUser, today }),
  ]

  const stored = await repo.insertEvents(events)
  result.eventsCreated = stored.length
  if (stored.length === 0) return result

  // 사용자별로 묶는다 — 이벤트마다 보내면 카톡이 도배된다
  const byUser = new Map<string, StoredNotificationEvent[]>()
  for (const e of stored) {
    const list = byUser.get(e.userId) ?? []
    list.push(e)
    byUser.set(e.userId, list)
  }

  const countSkip = (reason: string) => {
    result.deliveriesSkipped += 1
    result.skipReasons[reason] = (result.skipReasons[reason] ?? 0) + 1
  }

  for (const [userId, userEvents] of byUser) {
    const eventIds = userEvents.map((e) => e.id)
    const prefs = prefsByUser.get(userId)

    if (prefs && prefs.channel === 'none') {
      await repo.insertDelivery({ userId, eventIds, channel: 'kakao', status: 'skipped', skipReason: 'prefs_off', attempts: 0 })
      countSkip('prefs_off')
      continue
    }

    if (prefs && isQuietHour(nowHhmm, prefs.quietStart, prefs.quietEnd)) {
      // 이벤트는 이미 저장됐으니 다음 실행에서 다시 묶이진 않는다.
      // 조용한 시간에 걸린 건은 발송만 건너뛴다 — 소식 탭에서는 바로 보인다.
      await repo.insertDelivery({ userId, eventIds, channel: 'kakao', status: 'skipped', skipReason: 'quiet_hours', attempts: 0 })
      countSkip('quiet_hours')
      continue
    }

    if (!sender) {
      await repo.insertDelivery({ userId, eventIds, channel: 'kakao', status: 'skipped', skipReason: 'sending_disabled', attempts: 0 })
      countSkip('sending_disabled')
      continue
    }

    try {
      const res = await sender.send({
        userId,
        text: summarizeForMessage(userEvents),
        eventCount: userEvents.length,
      })
      if (res.ok) {
        await repo.insertDelivery({ userId, eventIds, channel: 'kakao', status: 'sent', attempts: 1 })
        result.deliveriesSent += 1
      } else {
        await repo.insertDelivery({ userId, eventIds, channel: 'kakao', status: 'skipped', skipReason: res.skipReason, attempts: 1 })
        countSkip(res.skipReason)
      }
    } catch (e) {
      await repo.insertDelivery({
        userId, eventIds, channel: 'kakao', status: 'failed', attempts: 1,
        error: e instanceof Error ? e.message : String(e),
      })
      result.deliveriesFailed += 1
    }
  }

  return result
}
