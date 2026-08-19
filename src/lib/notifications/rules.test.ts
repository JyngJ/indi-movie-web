import { describe, expect, it } from 'vitest'
import {
  buildLastWeekEvents, buildNewScreeningEvents, isoWeekKey, isQuietHour,
  newScreeningDedupeKey, summarizeForMessage,
} from './rules'
import type { FavoriteRef, LastWeekFact, NotificationPrefs, ScreeningFact } from './types'

const screening = (o: Partial<ScreeningFact> = {}): ScreeningFact => ({
  movieId: 'm1', movieTitle: '경멸', directors: ['장-뤽 고다르'], posterUrl: 'p.jpg',
  theaterId: 't1', theaterName: '아트하우스 모모', regionId: '서울',
  dates: ['2026-08-20', '2026-08-21'], ...o,
})

const prefs = (o: Partial<NotificationPrefs> = {}): NotificationPrefs => ({
  userId: 'u1', newScreening: true, lastWeek: true, weeklyDigest: false,
  quietStart: '21:00', quietEnd: '09:00', channel: 'kakao', regionIds: [], ...o,
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
    expect(out[0].coveredKeys).toEqual([newScreeningDedupeKey('m1', 't1')])
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

  it('관심 극장의 새 작품은 극장 단위로 한 장에 묶는다', () => {
    const favorites: FavoriteRef[] = [{ userId: 'u1', type: 'theater', id: 't1' }]
    const many = Array.from({ length: 50 }, (_, i) => screening({ movieId: `m${i}` }))
    const out = buildNewScreeningEvents({
      favorites, screenings: many, prefsByUser: new Map(), seenKeysByUser: new Map(),
    })
    expect(out).toHaveLength(1)
    expect(out[0].payload.groupedBy).toBe('theater')
    expect(out[0].payload.groupedCount).toBe(50)
    expect(out[0].coveredKeys).toHaveLength(50)
  })

  it('관심 영화가 여러 극장에 걸리면 영화 단위로 한 장에 묶는다 (도배 방지)', () => {
    const favorites: FavoriteRef[] = [{ userId: 'u1', type: 'movie', id: 'm1' }]
    const many = Array.from({ length: 40 }, (_, i) => screening({ theaterId: `t${i}`, theaterName: `극장${i}` }))
    const out = buildNewScreeningEvents({
      favorites, screenings: many, prefsByUser: new Map(), seenKeysByUser: new Map(),
    })
    expect(out).toHaveLength(1)
    expect(out[0].payload.groupedBy).toBe('movie')
    expect(out[0].payload.groupedCount).toBe(40)
    // 묶인 40개 조합이 전부 원장에 기록돼야 다음 실행에서 재알림이 안 난다
    expect(out[0].coveredKeys).toHaveLength(40)
  })

  it('묶은 소식의 대표는 상영일이 가장 이른 극장', () => {
    const favorites: FavoriteRef[] = [{ userId: 'u1', type: 'movie', id: 'm1' }]
    const out = buildNewScreeningEvents({
      favorites,
      screenings: [
        screening({ theaterId: 't2', theaterName: '늦은곳', dates: ['2026-09-01'] }),
        screening({ theaterId: 't1', theaterName: '빠른곳', dates: ['2026-08-21'] }),
      ],
      prefsByUser: new Map(), seenKeysByUser: new Map(),
    })
    expect(out).toHaveLength(1)
    expect(out[0].payload.theaterName).toBe('빠른곳')
    expect(out[0].payload.firstDate).toBe('2026-08-21')
  })

  it('서로 다른 관심 영화는 각각 한 장', () => {
    const favorites: FavoriteRef[] = [
      { userId: 'u1', type: 'movie', id: 'm1' },
      { userId: 'u1', type: 'movie', id: 'm2' },
    ]
    const out = buildNewScreeningEvents({
      favorites,
      screenings: [screening(), screening({ movieId: 'm2', movieTitle: '몽상가들' })],
      prefsByUser: new Map(), seenKeysByUser: new Map(),
    })
    expect(out).toHaveLength(2)
  })

  it('묶은 뒤에도 사용자당 상한을 지킨다', () => {
    const favorites: FavoriteRef[] = Array.from({ length: 40 }, (_, i) => ({ userId: 'u1', type: 'movie' as const, id: `m${i}` }))
    const many = Array.from({ length: 40 }, (_, i) => screening({ movieId: `m${i}`, theaterId: `t${i}` }))
    const out = buildNewScreeningEvents({
      favorites, screenings: many, prefsByUser: new Map(), seenKeysByUser: new Map(),
    })
    expect(out).toHaveLength(20)
  })
})

describe('지역 필터', () => {
  const seoul = screening({ theaterId: 't1', theaterName: '서울극장', regionId: '서울' })
  const busan = screening({ theaterId: 't2', theaterName: '부산극장', regionId: '부산' })

  it('설정한 지역의 상영만 알린다', () => {
    const out = buildNewScreeningEvents({
      favorites: [{ userId: 'u1', type: 'movie', id: 'm1' }],
      screenings: [seoul, busan],
      prefsByUser: new Map([['u1', prefs({ regionIds: ['부산'] })]]),
      seenKeysByUser: new Map(),
    })
    expect(out).toHaveLength(1)
    expect(out[0].payload.theaterName).toBe('부산극장')
  })

  it('지역 설정이 없으면 관심 극장의 지역으로 자동 추론한다', () => {
    const out = buildNewScreeningEvents({
      // 부산극장(t2)을 하트 → 부산 지역만 관심
      favorites: [
        { userId: 'u1', type: 'movie', id: 'm1' },
        { userId: 'u1', type: 'theater', id: 't2' },
      ],
      screenings: [seoul, busan],
      prefsByUser: new Map(), seenKeysByUser: new Map(),
    })
    // 부산 상영 1건만 — 서울은 지역 밖이라 빠진다
    expect(out).toHaveLength(1)
    expect(out[0].payload.theaterName).toBe('부산극장')
  })

  it('지역 설정도 관심 극장도 없으면 전국을 본다', () => {
    const out = buildNewScreeningEvents({
      favorites: [{ userId: 'u1', type: 'movie', id: 'm1' }],
      screenings: [seoul, busan],
      prefsByUser: new Map(), seenKeysByUser: new Map(),
    })
    expect(out).toHaveLength(1)          // 같은 영화라 한 장으로 묶임
    expect(out[0].payload.groupedCount).toBe(2)
  })

  it('관심 극장으로 걸린 소식은 지역 설정과 무관하게 간다', () => {
    const out = buildNewScreeningEvents({
      // 서울 극장을 직접 하트했는데 알림 지역은 부산으로 설정한 경우
      favorites: [{ userId: 'u1', type: 'theater', id: 't1' }],
      screenings: [seoul],
      prefsByUser: new Map([['u1', prefs({ regionIds: ['부산'] })]]),
      seenKeysByUser: new Map(),
    })
    expect(out).toHaveLength(1)
  })

  it('막바지도 지역 밖이면 안 알린다', () => {
    const out = buildLastWeekEvents({
      favorites: [{ userId: 'u1', type: 'movie', id: 'm1' }],
      screenings: [busan],
      lastWeekFacts: [{ movieId: 'm1', daysLeft: 1, confidence: 'confirmed' }],
      prefsByUser: new Map([['u1', prefs({ regionIds: ['서울'] })]]),
      seenKeysByUser: new Map(), today: '2026-08-20',
    })
    expect(out).toHaveLength(0)
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
      payload: { movieTitle: '경멸', directors: [], theaterName: 'x' }, dedupeKey: 'k', coveredKeys: ['k'],
    }])).toBe('경멸 새 상영이 생겼어요')
  })

  it('여러 편이면 외 N편', () => {
    const mk = (t: string) => ({
      userId: 'u1', kind: 'new_screening' as const, subjectType: 'movie' as const, subjectId: 'm',
      payload: { movieTitle: t, directors: [], theaterName: 'x' }, dedupeKey: t, coveredKeys: [t],
    })
    expect(summarizeForMessage([mk('경멸'), mk('몽상가들')])).toBe('경멸 외 1편 새 상영이 생겼어요')
  })
})
