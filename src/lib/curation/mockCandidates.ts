import {
  fixtureMovie,
  inMemoryNewIndieFilmsRepository,
  inMemoryReturningFilmsRepository,
  run,
} from './fixtures'
import type {
  NewIndieFilmCandidate,
  NewIndieFilmsRepository,
  ReturningFilmCandidate,
  ReturningFilmsRepository,
  ScreeningRun,
} from './types'

// 임시 목업 데이터 — curation_cache 테이블이 아직 없거나 비어 있을 때 UI 확인용.

function shiftMonths(asOfDate: string, months: number): string {
  const base = new Date(`${asOfDate}T00:00:00Z`)
  const shifted = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + months, base.getUTCDate()))
  return shifted.toISOString().slice(0, 10)
}

function shiftDays(asOfDate: string, days: number): string {
  const base = new Date(`${asOfDate}T00:00:00Z`)
  const shifted = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + days))
  return shifted.toISOString().slice(0, 10)
}

function returningRuns(asOfDate: string, prevStart: number, prevEnd: number, currStart: number, currEnd: number): ScreeningRun[] {
  return [
    run(shiftMonths(asOfDate, prevStart), shiftMonths(asOfDate, prevEnd)),
    run(shiftMonths(asOfDate, currStart), shiftMonths(asOfDate, currEnd)),
  ]
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
  ]
}

function buildNewIndieFilmCandidates(asOfDate: string): NewIndieFilmCandidate[] {
  return [
    { movie: fixtureMovie({ id: 'mock-new-1', title: '밤의 행진', year: 2024, genre: ['드라마'], director: ['장도윤'] }), firstShowDate: shiftDays(asOfDate, -2) },
    { movie: fixtureMovie({ id: 'mock-new-2', title: '우리의 계절', year: 2024, genre: ['로맨스'], director: ['배지유'] }), firstShowDate: shiftDays(asOfDate, -1) },
    { movie: fixtureMovie({ id: 'mock-new-3', title: '긴 여행의 기록', year: 2024, genre: ['다큐멘터리'], director: ['최은호'] }), firstShowDate: asOfDate },
    { movie: fixtureMovie({ id: 'mock-new-4', title: '먼 곳의 빛', year: 2024, genre: ['드라마'], director: ['윤채린'] }), firstShowDate: asOfDate },
  ]
}

export function mockReturningFilmsRepository(asOfDate: string): ReturningFilmsRepository {
  return inMemoryReturningFilmsRepository(buildReturningFilmCandidates(asOfDate))
}

export function mockNewIndieFilmsRepository(asOfDate: string): NewIndieFilmsRepository {
  return inMemoryNewIndieFilmsRepository(buildNewIndieFilmCandidates(asOfDate))
}
