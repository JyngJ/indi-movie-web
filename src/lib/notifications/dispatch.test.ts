import { describe, expect, it, vi } from 'vitest'
import { runNotificationDispatch, type NotificationSender } from './dispatch'
import type { NotificationBatchRepository } from './repository'
import { DEFAULT_PREFS, type DeliveryRecord, type NotificationPrefs, type StoredNotificationEvent } from './types'

function makeRepo(over: Partial<NotificationBatchRepository> = {}) {
  const deliveries: DeliveryRecord[] = []
  const repo: NotificationBatchRepository = {
    listAllFavorites: async () => [{ userId: 'u1', type: 'movie', id: 'm1' }],
    listPrefs: async (ids) => new Map<string, NotificationPrefs>(ids.map((id) => [id, { userId: id, ...DEFAULT_PREFS }])),
    listScreeningFacts: async () => [{
      movieId: 'm1', movieTitle: '경멸', directors: ['장-뤽 고다르'], posterUrl: 'p.jpg',
      theaterId: 't1', theaterName: '아트하우스 모모', dates: ['2026-08-21'],
    }],
    listLastWeekFacts: async () => [],
    listSeenDedupeKeys: async (ids) => new Map(ids.map((id) => [id, new Set<string>()])),
    insertEvents: async (events) => events.map((e, i) => ({
      ...e, id: `e${i}`, createdAt: '2026-08-20T00:00:00Z', readAt: null,
    }) as StoredNotificationEvent),
    insertDelivery: async (r) => { deliveries.push(r) },
    ...over,
  }
  return { repo, deliveries }
}

const baseOpts = { today: '2026-08-20', nowHhmm: '13:00' }

describe('runNotificationDispatch', () => {
  it('이벤트를 만들고, sender가 없으면 발송은 sending_disabled로 건너뛴다', async () => {
    const { repo, deliveries } = makeRepo()
    const r = await runNotificationDispatch(repo, baseOpts)

    expect(r.eventsCreated).toBe(1)
    expect(r.deliveriesSkipped).toBe(1)
    expect(r.deliveriesSent).toBe(0)
    expect(r.skipReasons.sending_disabled).toBe(1)
    expect(deliveries[0].status).toBe('skipped')
    expect(deliveries[0].eventIds).toEqual(['e0'])
  })

  it('조용한 시간이면 발송을 미루지만 이벤트는 남는다', async () => {
    const { repo, deliveries } = makeRepo()
    const sender: NotificationSender = { send: vi.fn(async () => ({ ok: true as const })) }
    const r = await runNotificationDispatch(repo, { ...baseOpts, nowHhmm: '23:30', sender })

    expect(r.eventsCreated).toBe(1)
    expect(r.skipReasons.quiet_hours).toBe(1)
    expect(sender.send).not.toHaveBeenCalled()
    expect(deliveries[0].skipReason).toBe('quiet_hours')
  })

  it('sender가 있으면 사용자당 한 번만 보낸다', async () => {
    const { repo } = makeRepo({
      listAllFavorites: async () => [
        { userId: 'u1', type: 'movie', id: 'm1' },
        { userId: 'u1', type: 'movie', id: 'm2' },
      ],
      listScreeningFacts: async () => [
        { movieId: 'm1', movieTitle: '경멸', directors: [], theaterId: 't1', theaterName: 'A', dates: ['2026-08-21'] },
        { movieId: 'm2', movieTitle: '몽상가들', directors: [], theaterId: 't2', theaterName: 'B', dates: ['2026-08-22'] },
      ],
    })
    const sent: Array<{ userId: string; text: string; eventCount: number }> = []
    const send = vi.fn(async (input: { userId: string; text: string; eventCount: number }) => {
      sent.push(input)
      return { ok: true as const }
    })
    const r = await runNotificationDispatch(repo, { ...baseOpts, sender: { send } })

    expect(r.eventsCreated).toBe(2)
    expect(send).toHaveBeenCalledTimes(1)
    expect(sent[0].text).toContain('외 1편')
    expect(r.deliveriesSent).toBe(1)
  })

  it('채널을 끈 사용자는 prefs_off', async () => {
    const { repo } = makeRepo({
      listPrefs: async (ids) => new Map(ids.map((id) => [id, { userId: id, ...DEFAULT_PREFS, channel: 'none' as const }])),
    })
    const send = vi.fn(async () => ({ ok: true as const }))
    const r = await runNotificationDispatch(repo, { ...baseOpts, sender: { send } })

    expect(r.skipReasons.prefs_off).toBe(1)
    expect(send).not.toHaveBeenCalled()
  })

  it('발송이 던지면 failed로 기록하고 계속 진행한다', async () => {
    const { repo, deliveries } = makeRepo()
    const sender: NotificationSender = { send: async () => { throw new Error('kakao 502') } }
    const r = await runNotificationDispatch(repo, { ...baseOpts, sender })

    expect(r.deliveriesFailed).toBe(1)
    expect(deliveries[0].status).toBe('failed')
    expect(deliveries[0].error).toBe('kakao 502')
  })

  it('토큰 없는 사용자는 no_kakao_token으로 skip', async () => {
    const { repo } = makeRepo()
    const sender: NotificationSender = { send: async () => ({ ok: false, skipReason: 'no_kakao_token' }) }
    const r = await runNotificationDispatch(repo, { ...baseOpts, sender })

    expect(r.skipReasons.no_kakao_token).toBe(1)
  })

  it('관심이 없으면 아무것도 안 한다', async () => {
    const { repo, deliveries } = makeRepo({ listAllFavorites: async () => [] })
    const r = await runNotificationDispatch(repo, baseOpts)

    expect(r.usersConsidered).toBe(0)
    expect(r.eventsCreated).toBe(0)
    expect(deliveries).toHaveLength(0)
  })

  it('이미 알린 조합만 있으면 발송 자체가 없다', async () => {
    const { repo, deliveries } = makeRepo({
      listSeenDedupeKeys: async (ids) => new Map(ids.map((id) => [id, new Set(['new_screening:m1:t1'])])),
    })
    const r = await runNotificationDispatch(repo, baseOpts)

    expect(r.eventsCreated).toBe(0)
    expect(deliveries).toHaveLength(0)
  })
})
