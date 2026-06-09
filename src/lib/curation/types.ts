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
// 이번 주 새로 개봉한 독립영화 (new indie films)
// 기준: 이번 주(월~일)가 DB에 기록된 첫 show_date
// ─────────────────────────────────────────────

export interface NewIndieFilmCandidate {
  movie: Movie
  /** ISO date "YYYY-MM-DD" — 이 영화의 DB 상 첫 번째 show_date */
  firstShowDate: string
}

export interface NewIndieFilmsRepository {
  getCandidates(weekStart: string, weekEnd: string): Promise<NewIndieFilmCandidate[]>
}

export interface NewIndieFilm {
  movie: Movie
  firstShowDate: string
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
