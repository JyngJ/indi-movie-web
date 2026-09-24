import { describe, expect, it } from 'vitest'
import { dateWithDow, festivalMetaDescription, festivalSeoTitle, summarizeFestivalScreenings } from './festivalSeo'
import type { FestivalDetail, FestivalScreening, FestivalTheaterLink } from '@/types/festival'

const link = (sortOrder: number, venueText: string): FestivalTheaterLink => ({
  id: `l${sortOrder}`, festivalId: 'f', theaterId: null, theater: null, venueText, sortOrder,
})
const screening = (over: Partial<FestivalScreening>): FestivalScreening => ({
  id: Math.random().toString(), festivalId: 'f', screeningDate: '2026-10-07', startTime: '10:00', runtimeMin: null,
  festivalTheaterId: null, venueLabel: '영화의전당', screenLabel: '중극장', movieId: null, movieTitleSnapshot: '호프',
  section: '한국영화의 오늘', screeningCode: '001', hasGv: false, bookingUrl: null, ...over,
})
const festival = (over: Partial<FestivalDetail> = {}): FestivalDetail => ({
  id: 'f', name: '제31회 부산국제영화제', slug: 'biff31', startDate: '2026-10-06', endDate: '2026-10-15',
  region: '부산', city: '부산', venueText: null, bannerUrl: null, posterUrl: null, shortcutImageUrl: null,
  linkUrl: null, description: null, isActive: true,
  theaters: [link(1, 'CGV 센텀시티'), link(0, '영화의전당'), link(2, '롯데시네마 센텀시티'), link(3, '부산시청자미디어센터')],
  movies: [], timetables: [], screenings: [], ...over,
})

describe('festivalSeoTitle', () => {
  it('회차가 있으면 상영 시간표와 극장 수를 싣는다', () => {
    expect(festivalSeoTitle(festival({ screenings: [screening({})] }))).toBe('제31회 부산국제영화제 상영 시간표 · 극장 4곳')
  })
  it('회차가 없으면 상영작·극장', () => {
    expect(festivalSeoTitle(festival())).toBe('제31회 부산국제영화제 상영작·극장')
  })
})

describe('festivalMetaDescription', () => {
  it('기간·회차·앞 극장 3곳·GV 수로 만든다', () => {
    const d = festivalMetaDescription(festival({ screenings: [screening({ hasGv: true }), screening({})] }))
    expect(d).toBe('제31회 부산국제영화제(10월 6일~10월 15일) 상영 시간표 2회차를 날짜·극장별로 정리했어요. 영화의전당·CGV 센텀시티·롯데시네마 센텀시티 등 4곳 · GV 1회차')
  })
  it('회차가 없으면 소개를, 소개도 없으면 기본 문장을 쓴다', () => {
    expect(festivalMetaDescription(festival({ description: '짧은 소개' }))).toBe('짧은 소개')
    expect(festivalMetaDescription(festival())).toBe('부산에서 열리는 제31회 부산국제영화제(10월 6일~10월 15일). 상영작과 극장을 모았어요.')
  })
  it('110자를 넘지 않는다', () => {
    const many = festival({ theaters: Array.from({ length: 30 }, (_, i) => link(i, `아주 긴 이름의 극장 ${i}번 상영장`)), screenings: [screening({})] })
    expect(festivalMetaDescription(many).length).toBeLessThanOrEqual(110)
  })
})

describe('summarizeFestivalScreenings', () => {
  const summary = summarizeFestivalScreenings([
    screening({ screeningDate: '2026-10-08', venueLabel: 'CGV 센텀시티', hasGv: true }),
    screening({ screeningDate: '2026-10-07' }),
    screening({ screeningDate: '2026-10-07', movieTitleSnapshot: '룩백', section: '갈라 프레젠테이션' }),
    screening({ screeningDate: '2026-10-08', section: null, movieTitleSnapshot: '수상작' }),
  ])
  it('날짜순으로 회차 수와 극장을 모은다', () => {
    expect(summary.byDate).toEqual([
      { date: '2026-10-07', count: 2, venues: ['영화의전당'] },
      { date: '2026-10-08', count: 2, venues: ['CGV 센텀시티', '영화의전당'] },
    ])
  })
  it('섹션별 상영작은 같은 제목을 한 번만 싣는다', () => {
    expect(summary.bySection).toEqual([
      { section: '한국영화의 오늘', titles: ['호프'] },
      { section: '갈라 프레젠테이션', titles: ['룩백'] },
      { section: '기타', titles: ['수상작'] },
    ])
    expect(summary.titleCount).toBe(3)
    expect(summary.gvCount).toBe(1)
  })
})

describe('dateWithDow', () => {
  it('요일을 붙인다', () => {
    expect(dateWithDow('2026-10-09')).toBe('10월 9일 (금)')
  })
})
