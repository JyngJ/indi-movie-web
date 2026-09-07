import { describe, it, expect } from 'vitest'
import {
  parseDistrict,
  groupByDistrict,
  describeTheater,
  toTheaterProfiles,
  type TheaterProfile,
} from './theaterDirectory'
import type { ScreeningTheater } from './getScreeningIndex'

function profile(over: Partial<TheaterProfile> = {}): TheaterProfile {
  return {
    id: 't1',
    name: '인디스페이스',
    address: '서울 마포구 양화로 176',
    district: '마포구',
    screenCount: 2,
    todayMovieCount: 3,
    ...over,
  }
}

describe('parseDistrict', () => {
  it('시·도 다음의 구를 읽는다', () => {
    expect(parseDistrict('서울 종로구 삼일대로 428')).toBe('종로구')
    expect(parseDistrict('서울특별시 마포구 양화로 176')).toBe('마포구')
  })

  it('군·시로 끝나는 단위도 읽는다 — 서울 전용이 아니다', () => {
    expect(parseDistrict('경기 수원시 팔달구 어딘가')).toBe('수원시')
    expect(parseDistrict('전남 구례군 어딘가')).toBe('구례군')
  })

  it('도로명은 구로 오해하지 않는다', () => {
    // '대구'로 끝나는 도로명이 세 번째 토큰 뒤에 와도 잡히면 안 된다
    expect(parseDistrict('서울 중구 정동길 3 경향아트힐')).toBe('중구')
  })

  it('읽을 수 없으면 null', () => {
    expect(parseDistrict('')).toBeNull()
    expect(parseDistrict('서울')).toBeNull()
    expect(parseDistrict('서울 세종대로 110')).toBeNull()
  })
})

describe('groupByDistrict', () => {
  it('구별로 묶고 극장 수 많은 순으로 정렬한다', () => {
    const groups = groupByDistrict([
      profile({ id: 'a', name: '에무시네마', district: '종로구' }),
      profile({ id: 'b', name: '인디스페이스', district: '마포구' }),
      profile({ id: 'c', name: '씨네큐브 광화문', district: '종로구' }),
      profile({ id: 'd', name: '낭만극장', district: '종로구' }),
    ])

    expect(groups.map((g) => g.district)).toEqual(['종로구', '마포구'])
    expect(groups[0].theaters).toHaveLength(3)
  })

  it('같은 구 안에서는 이름 순', () => {
    const groups = groupByDistrict([
      profile({ id: 'a', name: '허리우드클래식', district: '종로구' }),
      profile({ id: 'b', name: '낭만극장', district: '종로구' }),
    ])
    expect(groups[0].theaters.map((t) => t.name)).toEqual(['낭만극장', '허리우드클래식'])
  })

  it("구를 못 읽은 극장은 '기타'로 묶어 맨 뒤에 둔다", () => {
    const groups = groupByDistrict([
      profile({ id: 'a', name: '어디극장', district: null }),
      profile({ id: 'b', name: '인디스페이스', district: '마포구' }),
    ])
    expect(groups.map((g) => g.district)).toEqual(['마포구', '기타'])
  })
})

describe('describeTheater', () => {
  it('가진 사실만 이어 붙인다', () => {
    expect(describeTheater(profile())).toBe('마포구 · 상영관 2개 · 오늘 3편 상영')
  })

  it('상영관 수가 없으면 그 부분을 뺀다', () => {
    expect(describeTheater(profile({ screenCount: null }))).toBe('마포구 · 오늘 3편 상영')
  })

  it('오늘 상영이 없으면 그렇게 적는다 — 편수를 지어내지 않는다', () => {
    expect(describeTheater(profile({ todayMovieCount: 0 })))
      .toBe('마포구 · 상영관 2개 · 오늘은 상영 없음')
  })

  it('구를 못 읽어도 나머지로 문장이 선다', () => {
    expect(describeTheater(profile({ district: null, screenCount: null })))
      .toBe('오늘 3편 상영')
  })
})

describe('toTheaterProfiles', () => {
  const theaters: ScreeningTheater[] = [
    {
      id: 't1', name: '인디스페이스', city: '서울', region: '서울',
      address: '서울 마포구 양화로 176', screenCount: 2,
    },
    {
      id: 't2', name: '낭만극장', city: '서울', region: '서울',
      address: '서울 종로구 삼일대로 428', screenCount: null,
    },
  ]

  it('주소에서 구를 채우고 오늘 편수를 붙인다', () => {
    const result = toTheaterProfiles(theaters, new Map([['t1', 3]]))
    expect(result[0]).toMatchObject({ district: '마포구', screenCount: 2, todayMovieCount: 3 })
    // 오늘 상영이 없는 극장도 목록에서 빠지지 않는다 — 목록의 값어치는 완결성이다
    expect(result[1]).toMatchObject({ district: '종로구', todayMovieCount: 0 })
  })
})
