import { describe, expect, it } from 'vitest'
import {
  buildLastWeekEvents, buildNewScreeningEvents, isoWeekKey, isQuietHour,
  newScreeningDedupeKey, summarizeForMessage,
} from './rules'
import type { FavoriteRef, LastWeekFact, NotificationPrefs, ScreeningFact } from './types'

const screening = (o: Partial<ScreeningFact> = {}): ScreeningFact => ({
  movieId: 'm1', movieTitle: '경멸', directors: ['장-뤽 고다르'], posterUrl: 'p.jpg',
  theaterId: 't1', theaterName: '아트하우스 모모', dates: ['2026-08-20', '2026-08-21'], ...o,
})

const prefs = (o: Partial<NotificationPrefs> = {}): NotificationPrefs => ({
  userId: 'u1', newScreening: true, lastWeek: true, weeklyDigest: false,
  quietStart: '21:00', quietEnd: '09:00', channel: 'kakao', ...o,
})

describe('buildNewScreeningEvents', () => {
  it('관심 영화가 걸린 상영에 이벤트를 만든다', () => {
    const favorites: FavoriteRef[] = [{ userId: 'u1', type: 'movie', id: 'm1' }]
    const out = buildNewScreeningEvents({
      favorites, screenings: [screening()],
      prefsByUser: new Map([['u1', prefs()]]), seenKeysByUser: new Map(),
    })
    expect(out).toHaveLength(1)
    expect(out[0].subjectType).toBe('movie')
    expect(out[0].dedupeKey).toBe(newScreeningDedupeKey('m1', 't1'))
    expect(out[0].payload.theaterName).toBe('아트하우스 모모')
  })

  it('관심 감독 작품도 잡는다', () => {
    const favorites: FavoriteRef[] = [{ userId: 'u1', type: 'director', id: '장-뤽 고다르' }]
    const out = buildNewScreeningEvents({
      favorites, screenings: [screening()],
      prefsByUser: new Map(), seenKeysByUser: new Map(),
    })
    expect(out[0].subjectType).toBe('director')
    expect(out[0].subjectId).toBe('장-뤽 고다르')
  })

  it('관심 극장에 걸린 작품도 잡는다', () => {
    const favorites: FavoriteRef[] = [{ userId: 'u1', type: 'theater', id: 't1' }]
    const out = buildNewScreeningEvents({
      favorites, screenings: [screening()],
      prefsByUser: new Map(), seenKeysByUser: new Map(),
    })
    expect(out[0].subjectType).toBe('theater')
  })

  it('영화·감독·극장이 다 걸려도 소식은 하나, 영화 우선', () => {
    const favorites: FavoriteRef[] = [
      { userId: 'u1', type: 'movie', id: 'm1' },
      { userId: 'u1', type: 'director', id: '장-뤽 고다르' },
      { userId: 'u1', type: 'theater', id: 't1' },
    ]
    const out = buildNewScreeningEvents({
      favorites, screenings: [screening()],
      prefsByUser: new Map(), seenKeysByUser: new Map(),
    })
    expect(out).toHaveLength(1)
    expect(out[0].subjectType).toBe('movie')
  })

  it('이미 알린 영화×극장 조합은 건너뛴다', () => {
    const favorites: FavoriteRef[] = [{ userId: 'u1', type: 'movie', id: 'm1' }]
    const seen = new Map([['u1', new Set([newScreeningDedupeKey('m1', 't1')])]])
    const out = buildNewScreeningEvents({
      favorites, screenings: [screening()], prefsByUser: new Map(), seenKeysByUser: seen,
    })
    expect(out).toHaveLength(0)
  })

  it('같은 영화라도 다른 극장이면 새 소식이다', () => {
    const favorites: FavoriteRef[] = [{ userId: 'u1', type: 'movie', id: 'm1' }]
    const seen = new Map([['u1', new Set([newScreeningDedupeKey('m1', 't1')])]])
    const out = buildNewScreeningEvents({
      favorites,
      screenings: [screening(), screening({ theaterId: 't2', theaterName: '필름포럼' })],
      prefsByUser: new Map(), seenKeysByUser: seen,
    })
    expect(out).toHaveLength(1)
    expect(out[0].theaterId).toBe('t2')
  })

  it('설정에서 새 상영을 껐으면 만들지 않는다', () => {
    const favorites: FavoriteRef[] = [{ userId: 'u1', type: 'movie', id: 'm1' }]
    const out = buildNewScreeningEvents({
      favorites, screenings: [screening()],
      prefsByUser: new Map([['u1', prefs({ newScreening: false })]]), seenKeysByUser: new Map(),
    })
    expect(out).toHaveLength(0)
  })

  it('관심 없는 상영은 무시한다', () => {
    const out = buildNewScreeningEvents({
      favorites: [{ userId: 'u1', type: 'movie', id: 'other' }],
      screenings: [screening()], prefsByUser: new Map(), seenKeysByUser: new Map(),
    })
    expect(out).toHaveLength(0)
  })

  it('한 번에 만드는 이벤트 수를 제한한다', () => {
    const favorites: FavoriteRef[] = [{ userId: 'u1', type: 'theater', id: 't1' }]
    const many = Array.from({ length: 50 }, (_, i) => screening({ movieId: `m${i}` }))
    const out = buildNewScreeningEvents({
      favorites, screenings: many, prefsByUser: new Map(), seenKeysByUser: new Map(),
    })
    expect(out).toHaveLength(20)
  })
})

describe('buildLastWeekEvents', () => {
  const facts: LastWeekFact[] = [{ movieId: 'm1', daysLeft: 2, confidence: 'confirmed' }]

  it('관심 작품이 막바지면 이벤트를 만든다', () => {
    const out = buildLastWeekEvents({
      favorites: [{ userId: 'u1', type: 'movie', id: 'm1' }],
      screenings: [screening()], lastWeekFacts: facts,
      prefsByUser: new Map(), seenKeysByUser: new Map(), today: '2026-08-20',
    })
    expect(out).toHaveLength(1)
    expect(out[0].payload.daysLeft).toBe(2)
    expect(out[0].kind).toBe('last_week')
  })

  it('임계보다 여유 있으면 안 만든다', () => {
    const out = buildLastWeekEvents({
      favorites: [{ userId: 'u1', type: 'movie', id: 'm1' }],
      screenings: [screening()],
      lastWeekFacts: [{ movieId: 'm1', daysLeft: 9, confidence: 'likely' }],
      prefsByUser: new Map(), seenKeysByUser: new Map(), today: '2026-08-20',
    })
    expect(out).toHaveLength(0)
  })

  it('같은 주에는 한 번만 — 주차 키로 묶는다', () => {
    const seen = new Map([['u1', new Set([`last_week:m1:${isoWeekKey('2026-08-20')}`])]])
    const out = buildLastWeekEvents({
      favorites: [{ userId: 'u1', type: 'movie', id: 'm1' }],
      screenings: [screening()], lastWeekFacts: facts,
      prefsByUser: new Map(), seenKeysByUser: seen, today: '2026-08-20',
    })
    expect(out).toHaveLength(0)
  })

  it('관심 극장만 눌러둔 사용자에겐 막바지를 보내지 않는다', () => {
    const out = buildLastWeekEvents({
      favorites: [{ userId: 'u1', type: 'theater', id: 't1' }],
      screenings: [screening()], lastWeekFacts: facts,
      prefsByUser: new Map(), seenKeysByUser: new Map(), today: '2026-08-20',
    })
    expect(out).toHaveLength(0)
  })
})

describe('isQuietHour', () => {
  it('자정을 넘기는 구간(21:00~09:00)', () => {
    expect(isQuietHour('22:30', '21:00', '09:00')).toBe(true)
    expect(isQuietHour('03:00', '21:00', '09:00')).toBe(true)
    expect(isQuietHour('08:59', '21:00', '09:00')).toBe(true)
    expect(isQuietHour('09:00', '21:00', '09:00')).toBe(false)
    expect(isQuietHour('13:00', '21:00', '09:00')).toBe(false)
  })

  it('같은 날 안에서 끝나는 구간', () => {
    expect(isQuietHour('13:00', '12:00', '14:00')).toBe(true)
    expect(isQuietHour('15:00', '12:00', '14:00')).toBe(false)
  })

  it('시작과 끝이 같으면 조용한 시간 없음', () => {
    expect(isQuietHour('03:00', '09:00', '09:00')).toBe(false)
  })
})

describe('isoWeekKey', () => {
  it('같은 주는 같은 키', () => {
    expect(isoWeekKey('2026-08-17')).toBe(isoWeekKey('2026-08-23'))
  })
  it('주가 넘어가면 키가 바뀐다', () => {
    expect(isoWeekKey('2026-08-23')).not.toBe(isoWeekKey('2026-08-24'))
  })
})

describe('summarizeForMessage', () => {
  it('한 편', () => {
    expect(summarizeForMessage([{
      userId: 'u1', kind: 'new_screening', subjectType: 'movie', subjectId: 'm1',
      payload: { movieTitle: '경멸', directors: [], theaterName: 'x' }, dedupeKey: 'k',
    }])).toBe('경멸 새 상영이 생겼어요')
  })

  it('여러 편이면 외 N편', () => {
    const mk = (t: string) => ({
      userId: 'u1', kind: 'new_screening' as const, subjectType: 'movie' as const, subjectId: 'm',
      payload: { movieTitle: t, directors: [], theaterName: 'x' }, dedupeKey: t,
    })
    expect(summarizeForMessage([mk('경멸'), mk('몽상가들')])).toBe('경멸 외 1편 새 상영이 생겼어요')
  })
})
