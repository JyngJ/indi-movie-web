import { describe, expect, it } from 'vitest'
import type { FestivalScreening } from '@/types/festival'
import {
  festivalViewPath,
  listFestivalViews,
  parseFestivalView,
  selectViewScreenings,
} from './festivalView'

const screening = (over: Partial<FestivalScreening>): FestivalScreening => ({
  id: Math.random().toString(), festivalId: 'f', screeningDate: '2026-10-07', startTime: '10:00', runtimeMin: null,
  festivalTheaterId: null, venueLabel: '영화의전당', screenLabel: '중극장', movieId: null, movieTitleSnapshot: '호프',
  section: null, screeningCode: null, hasGv: false, bookingUrl: null, ...over,
})

const rows = [
  screening({ id: 'a', screeningDate: '2026-10-08', startTime: '19:30', hasGv: true }),
  screening({ id: 'b', screeningDate: '2026-10-07', startTime: '13:00' }),
  screening({ id: 'c', screeningDate: '2026-10-07', startTime: '10:00', venueLabel: 'CGV 센텀시티', hasGv: true }),
]

describe('parseFestivalView', () => {
  it('회차가 있는 날짜는 날짜 페이지', () => {
    expect(parseFestivalView('2026-10-07', rows)).toEqual({ kind: 'day', date: '2026-10-07' })
  })
  it('회차가 없는 날짜·형식이 틀린 조각은 null', () => {
    expect(parseFestivalView('2026-10-09', rows)).toBeNull()
    expect(parseFestivalView('10-07', rows)).toBeNull()
    expect(parseFestivalView('영화의전당', rows)).toBeNull()
  })
  it('gv는 GV 회차가 있을 때만', () => {
    expect(parseFestivalView('gv', rows)).toEqual({ kind: 'gv' })
    expect(parseFestivalView('gv', [screening({})])).toBeNull()
  })
})

describe('listFestivalViews', () => {
  it('날짜순 날짜 페이지 뒤에 GV', () => {
    expect(listFestivalViews(rows).map((v) => festivalViewPath('biff31', v))).toEqual([
      '/festival/biff31/2026-10-07',
      '/festival/biff31/2026-10-08',
      '/festival/biff31/gv',
    ])
  })
  it('GV 회차가 없으면 GV 페이지를 만들지 않는다', () => {
    expect(listFestivalViews([screening({})])).toEqual([{ kind: 'day', date: '2026-10-07' }])
  })
})

describe('selectViewScreenings', () => {
  it('날짜 페이지는 그날 회차를 시각순으로', () => {
    expect(selectViewScreenings(rows, { kind: 'day', date: '2026-10-07' }).map((s) => s.id)).toEqual(['c', 'b'])
  })
  it('GV 페이지는 GV 회차를 날짜 → 시각순으로', () => {
    expect(selectViewScreenings(rows, { kind: 'gv' }).map((s) => s.id)).toEqual(['c', 'a'])
  })
})
