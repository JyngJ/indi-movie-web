import { describe, expect, it } from 'vitest'
import { toFestivalSchema } from './toFestivalSchema'
import type { FestivalDetail } from '@/types/festival'
import type { Theater } from '@/types/api'

const theater: Theater = {
  id: 't1', name: '영화의전당', lat: 35.171, lng: 129.127, address: '부산 해운대구 수영강변대로 120', city: '부산',
  amenities: { parking: false, restaurant: false, accessibility: false }, createdAt: '', updatedAt: '',
}
const festival: FestivalDetail = {
  id: 'f', name: '제31회 부산국제영화제', slug: 'biff31', startDate: '2026-10-06', endDate: '2026-10-15',
  region: '부산', city: '부산', venueText: null, bannerUrl: null, posterUrl: '/images/festivals/biff31-poster.jpg',
  shortcutImageUrl: null, linkUrl: 'https://www.biff.kr/kor/', description: null, isActive: true,
  theaters: [
    { id: 'l0', festivalId: 'f', theaterId: 't1', theater, venueText: null, sortOrder: 0 },
    { id: 'l1', festivalId: 'f', theaterId: null, theater: null, venueText: '신세계백화점 센텀시티점', sortOrder: 1 },
  ],
  movies: [], timetables: [], screenings: [],
}

describe('toFestivalSchema', () => {
  const schema = toFestivalSchema(festival, 'https://example.com')

  it('소개가 없어도 설명과 일정 상태를 싣는다', () => {
    expect(schema.description).toContain('제31회 부산국제영화제')
    expect(schema.eventStatus).toBe('https://schema.org/EventScheduled')
    expect(schema.eventAttendanceMode).toBe('https://schema.org/OfflineEventAttendanceMode')
  })
  it('포스터 루트 경로를 절대 주소로, 공식 사이트를 sameAs로', () => {
    expect(schema.image).toBe('https://example.com/images/festivals/biff31-poster.jpg')
    expect(schema.sameAs).toBe('https://www.biff.kr/kor/')
  })
  it('연결된 극장은 주소·좌표까지, 이름만 있는 곳은 도시만', () => {
    const [linked, named] = schema.location as Record<string, unknown>[]
    expect(linked).toMatchObject({ name: '영화의전당', geo: { latitude: 35.171, longitude: 129.127 } })
    expect((linked.address as Record<string, unknown>).streetAddress).toBe('부산 해운대구 수영강변대로 120')
    expect(named).toMatchObject({ name: '신세계백화점 센텀시티점' })
    expect(named.geo).toBeUndefined()
  })
})
