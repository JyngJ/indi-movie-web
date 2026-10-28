import { describe, expect, it } from 'vitest'
import { certificationAge, listingIdentity, pickByRuntime } from './runtimeDisambiguation'

// 2026-10-28 KMDb 실측값
const 최종면접 = [
  { year: 2026, runtimeMinutes: 107, certification: '15세이상관람가' },
  { year: 2021, runtimeMinutes: 10, certification: '15세관람가' },
  { year: 2012, runtimeMinutes: undefined, certification: undefined },
]
const 욕쟁이할머니 = [
  { year: 2010, runtimeMinutes: 16, certification: undefined },
  { year: 2026, runtimeMinutes: 72, certification: '전체관람가' },
]

describe('listingIdentity', () => {
  it('러닝타임 필드가 없으면 종료 − 시작을 쓴다 (dtryx)', () => {
    const rawText = JSON.stringify({ PLAY_TIME: '1030', END_TIME: '1217', GRADE: '15' })
    expect(listingIdentity({ rawText, showTime: '10:30', endTime: '12:17' })).toEqual({ runtimeMinutes: 107, minAge: 15 })
  })

  it('자정을 넘기는 회차', () => {
    expect(listingIdentity({ showTime: '23:10', endTime: '01:05' }).runtimeMinutes).toBe(115)
  })

  it('원문 러닝타임 필드가 있으면 그것이 우선', () => {
    const rawText = JSON.stringify({ RunningTime: '126분' })
    expect(listingIdentity({ rawText, showTime: '10:00', endTime: '12:20' }).runtimeMinutes).toBe(126)
  })

  it('영화 길이로 볼 수 없는 종료 시각은 버린다', () => {
    expect(listingIdentity({ showTime: '10:00', endTime: '10:00' }).runtimeMinutes).toBeUndefined()
    expect(listingIdentity({ showTime: '10:00' }).runtimeMinutes).toBeUndefined()
  })
})

describe('certificationAge', () => {
  it('사이트·KMDb 표기를 연령으로 맞춘다', () => {
    expect(certificationAge('00')).toBe(0)
    expect(certificationAge('전체관람가')).toBe(0)
    expect(certificationAge('15')).toBe(15)
    expect(certificationAge('15세이상관람가')).toBe(15)
    expect(certificationAge('청소년관람불가')).toBe(18)
    expect(certificationAge('미정')).toBeUndefined()
  })
})

describe('pickByRuntime', () => {
  it('분 단위로 맞는 후보가 하나면 고른다 — 러닝타임 없는 후보는 막지 않는다', () => {
    expect(pickByRuntime(최종면접, { runtimeMinutes: 107, minAge: 15 })?.year).toBe(2026)
    expect(pickByRuntime(욕쟁이할머니, { runtimeMinutes: 72, minAge: 0 })?.year).toBe(2026)
  })

  it('광고가 붙어 분 단위로 안 맞으면 고르지 않는다', () => {
    expect(pickByRuntime(최종면접, { runtimeMinutes: 117 })).toBeUndefined()
  })

  it('다른 후보가 광고 포함 범위에 걸리면 고르지 않는다', () => {
    const options = [{ runtimeMinutes: 100 }, { runtimeMinutes: 92 }]
    expect(pickByRuntime(options, { runtimeMinutes: 101 })).toBeUndefined()
  })

  it('러닝타임이 비슷한 두 편은 고르지 않는다', () => {
    expect(pickByRuntime([{ runtimeMinutes: 106 }, { runtimeMinutes: 108 }], { runtimeMinutes: 107 })).toBeUndefined()
  })

  it('관람 등급이 어긋나면 고르지 않는다', () => {
    expect(pickByRuntime(최종면접, { runtimeMinutes: 107, minAge: 0 })).toBeUndefined()
  })

  it('상영 시간을 모르면 고르지 않는다', () => {
    expect(pickByRuntime(최종면접, {})).toBeUndefined()
  })
})
