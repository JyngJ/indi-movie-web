import {
  fixtureMovie,
  inMemoryHotIndieFilmsRepository,
  inMemoryReturningFilmsRepository,
  run,
} from './fixtures'
import type {
  HotIndieFilmCandidate,
  HotIndieFilmsRepository,
  ReturningFilmCandidate,
  ReturningFilmsRepository,
  ScreeningRun,
  TheaterScreeningStatus,
} from './types'

// 임시 목업 데이터 — Supabase 연동 repo(과거 상영 이력 분석, 매진 집계 쿼리)가
// 들어오기 전까지 큐레이션 시트 UI를 검증하기 위한 더미. 실 데이터 repo로 교체될 때
// 이 파일과 fixtures의 inMemory* 사용처를 함께 정리할 것.

function shiftMonths(asOfDate: string, months: number): string {
  const base = new Date(`${asOfDate}T00:00:00Z`)
  const shifted = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + months, base.getUTCDate()))
  return shifted.toISOString().slice(0, 10)
}

function returningRuns(asOfDate: string, prevStart: number, prevEnd: number, currStart: number, currEnd: number): ScreeningRun[] {
  return [
    run(shiftMonths(asOfDate, prevStart), shiftMonths(asOfDate, prevEnd)),
    run(shiftMonths(asOfDate, currStart), shiftMonths(asOfDate, currEnd)),
  ]
}

function theaterStatuses(total: number, soldOutCount: number): TheaterScreeningStatus[] {
  return Array.from({ length: total }, (_, i) => ({
    theaterId: `mock-theater-${i + 1}`,
    soldOut: i < soldOutCount,
  }))
}

function buildReturningFilmCandidates(asOfDate: string): ReturningFilmCandidate[] {
  return [
    {
      movie: fixtureMovie({ id: 'mock-returning-1', title: '어느 여름밤의 기록', year: 2021, genre: ['드라마'], director: ['한이서'] }),
      runs: returningRuns(asOfDate, -30, -29, -3, 1),
    },
    {
      movie: fixtureMovie({ id: 'mock-returning-2', title: '골목의 온도', year: 2022, genre: ['다큐멘터리'], director: ['오윤'] }),
      runs: returningRuns(asOfDate, -16, -15, -2, 1),
    },
    {
      movie: fixtureMovie({ id: 'mock-returning-3', title: '파도가 지나간 자리', year: 2023, genre: ['드라마'], director: ['신해강'] }),
      runs: returningRuns(asOfDate, -14, -13, -1, 2),
    },
    {
      movie: fixtureMovie({ id: 'mock-returning-4', title: '조용한 풍경', year: 2023, genre: ['드라마'], director: ['문소라'] }),
      runs: returningRuns(asOfDate, -8, -7, -1, 1),
    },
  ]
}

function buildHotIndieFilmCandidates(): HotIndieFilmCandidate[] {
  return [
    { movie: fixtureMovie({ id: 'mock-hot-1', title: '밤의 행진', year: 2024, genre: ['드라마'], director: ['장도윤'] }), theaterStatuses: theaterStatuses(6, 6) },
    { movie: fixtureMovie({ id: 'mock-hot-2', title: '우리의 계절', year: 2024, genre: ['로맨스'], director: ['배지유'] }), theaterStatuses: theaterStatuses(8, 7) },
    { movie: fixtureMovie({ id: 'mock-hot-3', title: '긴 여행의 기록', year: 2024, genre: ['다큐멘터리'], director: ['최은호'] }), theaterStatuses: theaterStatuses(5, 3) },
    { movie: fixtureMovie({ id: 'mock-hot-4', title: '먼 곳의 빛', year: 2024, genre: ['드라마'], director: ['윤채린'] }), theaterStatuses: theaterStatuses(7, 2) },
    { movie: fixtureMovie({ id: 'mock-hot-5', title: '아주 작은 선택', year: 2024, genre: ['드라마'], director: ['임수안'] }), theaterStatuses: theaterStatuses(4, 4) },
  ]
}

export function mockReturningFilmsRepository(asOfDate: string): ReturningFilmsRepository {
  return inMemoryReturningFilmsRepository(buildReturningFilmCandidates(asOfDate))
}

export function mockHotIndieFilmsRepository(): HotIndieFilmsRepository {
  return inMemoryHotIndieFilmsRepository(buildHotIndieFilmCandidates())
}
