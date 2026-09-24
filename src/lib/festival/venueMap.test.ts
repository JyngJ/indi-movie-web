import { describe, expect, it } from 'vitest'
import { buildFestivalVenueMap, shortPinLabel } from './venueMap'
import type { FestivalScreening, FestivalTheaterLink } from '@/types/festival'
import type { Theater } from '@/types/api'

const theater = (name: string, lat: number, lng: number): Theater => ({
  id: `t-${name}`, name, lat, lng, address: `${name} 주소`, city: '부산',
  amenities: { parking: false, restaurant: false, accessibility: false }, createdAt: '', updatedAt: '',
})
const link = (sortOrder: number, t: Theater | null, venueText: string | null = null): FestivalTheaterLink => ({
  id: `l${sortOrder}`, festivalId: 'f', theaterId: t?.id ?? null, theater: t, venueText, sortOrder,
})
const screening = (venueLabel: string): FestivalScreening => ({
  id: venueLabel + Math.random(), festivalId: 'f', screeningDate: '2026-10-10', startTime: '10:00', runtimeMin: null,
  festivalTheaterId: null, venueLabel, screenLabel: null, movieId: null, movieTitleSnapshot: '영화',
  section: null, screeningCode: null, hasGv: false, bookingUrl: null,
})

describe('buildFestivalVenueMap', () => {
  const theaters = [
    link(1, theater('CGV 센텀시티', 35.168, 129.129)),
    link(0, theater('영화의전당', 35.171, 129.127)),
    link(2, null, '신세계백화점 센텀시티점'),
  ]
  const { pinned, unpinned } = buildFestivalVenueMap(theaters, [screening('영화의전당'), screening('영화의전당'), screening('CGV 센텀시티')])

  it('영화제가 정한 순서로 좌표 있는 극장만 핀으로 세운다', () => {
    expect(pinned.map((v) => v.name)).toEqual(['영화의전당', 'CGV 센텀시티'])
  })
  it('극장별 회차 수를 붙인다', () => {
    expect(pinned.map((v) => v.screeningCount)).toEqual([2, 1])
  })
  it('좌표 없는 행사장은 따로 모은다', () => {
    expect(unpinned).toEqual(['신세계백화점 센텀시티점'])
  })
})

describe('shortPinLabel', () => {
  it('몰리는 핀의 긴 앞머리를 뗀다', () => {
    expect(shortPinLabel('동서대학교 소향씨어터')).toBe('소향씨어터')
    expect(shortPinLabel('영화진흥위원회 표준시사실')).toBe('표준시사실')
  })
  it('그 밖의 이름은 그대로 둔다', () => {
    expect(shortPinLabel('영화의전당')).toBe('영화의전당')
  })
})
