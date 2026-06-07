import type { Movie } from '@/types/api'

// ─────────────────────────────────────────────
// 오랜만에 상영하는 영화 (returning films)
// 기준: 직전 상영 종료일 → 이번 상영 시작일 사이의 공백(gap)
// ─────────────────────────────────────────────

export interface ScreeningRun {
  /** ISO date "YYYY-MM-DD" */
  startDate: string
  /** ISO date "YYYY-MM-DD" */
  endDate: string
}

export interface ReturningFilmCandidate {
  movie: Movie
  /** 이 영화의 모든 상영 구간(과거+현재), 시작일 오름차순 정렬 권장 */
  runs: ScreeningRun[]
}

export interface ReturningFilm {
  movie: Movie
  gapMonths: number
  /** 자동 생성된 배지 문구, 예: "14개월 만의 재상영" / "5년 만의 재상영" */
  tagText: string
  currentRunStartDate: string
  lastScreenedEndDate: string
}

export interface ReturningFilmsRepository {
  getCandidates(asOfDate: string): Promise<ReturningFilmCandidate[]>
}

// ─────────────────────────────────────────────
// 이번주 가장 핫한 독립영화 (hot indie films)
// 기준: 매진 영화관 비율 = 매진 상영관 수 / 전체 상영관 수
// ─────────────────────────────────────────────

export interface TheaterScreeningStatus {
  theaterId: string
  /**
   * 해당 영화관에서 이 영화의 (랭킹 산정 기간 내) 남은 회차가
   * 모두 잔여좌석 0이면 true.
   */
  soldOut: boolean
}

export interface HotIndieFilmCandidate {
  movie: Movie
  theaterStatuses: TheaterScreeningStatus[]
}

export interface HotIndieFilmsRepository {
  getCandidates(): Promise<HotIndieFilmCandidate[]>
}

export interface HotIndieFilm {
  movie: Movie
  theaterCount: number
  soldOutTheaterCount: number
  /** 0~1 */
  soldOutRatio: number
}

// ─────────────────────────────────────────────
// 최근 찾아본 영화 / 영화관 (recently viewed)
// 저장 위치: 쿠키(클라이언트 only, 계정 동기화는 추후 별도)
// ─────────────────────────────────────────────

export type RecentlyViewedKind = 'movie' | 'theater'

export interface RecentlyViewedEntry {
  id: string
  title: string
  /** 영화는 포스터 키, 영화관은 마커/썸네일 키 — 도메인엔 불투명한 표시용 값 */
  thumbnailKey?: string
}
