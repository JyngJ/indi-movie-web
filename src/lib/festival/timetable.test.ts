import { describe, expect, it } from 'vitest'
import {
  buildFestivalDays,
  countScreeningsByDate,
  defaultFestivalDay,
  festivalDayLabel,
  festivalDayShortLabel,
  formatScreeningTail,
  formatScreeningTime,
  listScreeningVenues,
  normalizeTime,
  screeningEndTime,
  selectDayScreenings,
  venueDisplayName,
} from './timetable'
import type { FestivalScreening } from '@/types/festival'

function makeScreening(over: Partial<FestivalScreening> = {}): FestivalScreening {
  return {
    id: 'x', festivalId: 'f', screeningDate: '2026-10-06', startTime: '19:30:00',
    runtimeMin: 95, festivalTheaterId: null, venueLabel: '영화의전당', screenLabel: '중극장',
    movieId: null, movieTitleSnapshot: '어떤 영화', section: null, screeningCode: null,
    hasGv: false, bookingUrl: null,
    ...over,
  }
}

describe('buildFestivalDays', () => {
  it('시작일과 종료일을 포함한 모든 날짜를 만든다', () => {
    expect(buildFestivalDays('2026-10-06', '2026-10-09')).toEqual([
      '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09',
    ])
  })
  it('하루짜리 영화제도 하루를 만든다', () => {
    expect(buildFestivalDays('2026-10-06', '2026-10-06')).toEqual(['2026-10-06'])
  })
  it('월을 넘어가도 이어진다', () => {
    expect(buildFestivalDays('2026-10-30', '2026-11-01')).toEqual([
      '2026-10-30', '2026-10-31', '2026-11-01',
    ])
  })
  it('종료일이 시작일보다 앞서면 빈 배열', () => {
    expect(buildFestivalDays('2026-10-09', '2026-10-06')).toEqual([])
  })
})

describe('festivalDayLabel', () => {
  it('요일까지 붙인다', () => {
    expect(festivalDayLabel('2026-10-06')).toBe('10월 6일 (화)')
  })
  it('짧은 꼴은 탭용', () => {
    expect(festivalDayShortLabel('2026-10-06')).toBe('10.6 화')
  })
})

describe('formatScreeningTime', () => {
  it('시작 시각과 종료 시각을 함께 낸다', () => {
    expect(formatScreeningTime('19:30:00', 95)).toBe('19:30 ~ 21:05')
  })
  it('runtime이 없으면 시작 시각만', () => {
    expect(formatScreeningTime('19:30:00', null)).toBe('19:30')
  })
  it('자정을 넘기는 심야 상영은 다음 날 시각으로 넘어간다', () => {
    expect(formatScreeningTime('23:30', 120)).toBe('23:30 ~ 01:30')
  })
  it('runtime이 0이면 시작 시각만', () => {
    expect(formatScreeningTime('10:00', 0)).toBe('10:00')
  })
})

describe('screeningEndTime / formatScreeningTail', () => {
  it('종료 시각을 낸다', () => {
    expect(screeningEndTime('19:30:00', 95)).toBe('21:05')
  })
  it('runtime이 없으면 null', () => {
    expect(screeningEndTime('19:30', null)).toBeNull()
  })
  it('보조 줄은 시작 시각을 다시 쓰지 않는다', () => {
    expect(formatScreeningTail('19:30:00', 95)).toBe('95분 · 21:05 종료')
  })
  it('runtime이 없으면 보조 줄도 없다', () => {
    expect(formatScreeningTail('19:30', null)).toBeNull()
  })
})

describe('normalizeTime / venueDisplayName', () => {
  it('Postgres TIME의 초를 버린다', () => {
    expect(normalizeTime('19:30:00')).toBe('19:30')
  })
  it('관 이름이 있으면 극장 뒤에 붙인다', () => {
    expect(venueDisplayName({ venueLabel: '영화의전당', screenLabel: '중극장' })).toBe('영화의전당 중극장')
  })
  it('관 이름이 없으면 극장 이름만', () => {
    expect(venueDisplayName({ venueLabel: '부산시청자미디어센터', screenLabel: null })).toBe('부산시청자미디어센터')
  })
})

describe('listScreeningVenues', () => {
  it('중복을 없애고 처음 등장한 순서를 지킨다', () => {
    const list = [
      makeScreening({ venueLabel: 'CGV 센텀시티' }),
      makeScreening({ venueLabel: '영화의전당' }),
      makeScreening({ venueLabel: 'CGV 센텀시티' }),
    ]
    expect(listScreeningVenues(list)).toEqual(['CGV 센텀시티', '영화의전당'])
  })
})

describe('selectDayScreenings', () => {
  const list = [
    makeScreening({ id: 'b', screeningDate: '2026-10-06', startTime: '20:00', venueLabel: '영화의전당' }),
    makeScreening({ id: 'a', screeningDate: '2026-10-06', startTime: '10:00', venueLabel: 'CGV 센텀시티' }),
    makeScreening({ id: 'c', screeningDate: '2026-10-07', startTime: '11:00', venueLabel: '영화의전당' }),
  ]
  it('그 날짜의 회차만 시간순으로 낸다', () => {
    expect(selectDayScreenings(list, '2026-10-06').map((s) => s.id)).toEqual(['a', 'b'])
  })
  it('상영관을 주면 그 극장만 남긴다', () => {
    expect(selectDayScreenings(list, '2026-10-06', '영화의전당').map((s) => s.id)).toEqual(['b'])
  })
  it('같은 시각이면 극장 이름으로 순서를 고정한다', () => {
    const sameTime = [
      makeScreening({ id: 'z', startTime: '14:00', venueLabel: '영화의전당' }),
      makeScreening({ id: 'y', startTime: '14:00', venueLabel: 'CGV 센텀시티' }),
    ]
    expect(selectDayScreenings(sameTime, '2026-10-06').map((s) => s.id)).toEqual(['y', 'z'])
  })
  it('회차가 없는 날짜는 빈 배열', () => {
    expect(selectDayScreenings(list, '2026-10-15')).toEqual([])
  })
})

describe('countScreeningsByDate', () => {
  it('날짜별로 센다', () => {
    const list = [
      makeScreening({ screeningDate: '2026-10-06' }),
      makeScreening({ screeningDate: '2026-10-06' }),
      makeScreening({ screeningDate: '2026-10-07' }),
    ]
    expect(countScreeningsByDate(list)).toEqual({ '2026-10-06': 2, '2026-10-07': 1 })
  })
})

describe('defaultFestivalDay', () => {
  const days = ['2026-10-06', '2026-10-07', '2026-10-08']
  it('회기 중이면 오늘을 연다', () => {
    expect(defaultFestivalDay(days, '2026-10-07')).toBe('2026-10-07')
  })
  it('회기 밖이면 첫날을 연다', () => {
    expect(defaultFestivalDay(days, '2026-09-01')).toBe('2026-10-06')
  })
  it('종료된 뒤에도 첫날을 연다', () => {
    expect(defaultFestivalDay(days, '2026-12-25')).toBe('2026-10-06')
  })
  it('날짜가 없으면 null', () => {
    expect(defaultFestivalDay([], '2026-10-07')).toBeNull()
  })
})
