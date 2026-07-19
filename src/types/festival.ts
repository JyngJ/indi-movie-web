import type { Movie, Theater } from './api'

// ─────────────────────────────────────────────
// 영화제 (festivals + 연결 테이블)
// docs/SUPABASE_FESTIVALS.sql / docs/DB.md 참고
// 상태(upcoming/ongoing/ended)는 저장하지 않는다 — src/lib/festival/status.ts에서 런타임 계산
// ─────────────────────────────────────────────

export interface Festival {
  id: string
  name: string
  slug: string
  /** ISO date "YYYY-MM-DD" */
  startDate: string
  /** ISO date "YYYY-MM-DD" */
  endDate: string
  region: string
  city: string
  /** 영화제 전체 요약 장소 표기 — 개별 상영관의 임시 장소명은 FestivalTheaterLink.venueText */
  venueText: string | null
  bannerUrl: string | null
  linkUrl: string | null
  description: string | null
  isActive: boolean
}

export interface FestivalTheaterLink {
  id: string
  festivalId: string
  /** DB에 없는 임시 상영장(야외 상영 등)이면 null */
  theaterId: string | null
  theater: Theater | null
  /** theaterId가 null일 때 이 행 하나의 임시 상영장 이름 */
  venueText: string | null
  sortOrder: number
}

export interface FestivalMovieLink {
  id: string
  festivalId: string
  /** movies에서 크롤 데이터가 빠지면 null(SET NULL) — movieTitleSnapshot으로 기록은 남는다 */
  movieId: string | null
  movie: Movie | null
  /** movieId가 null이 돼도 남는 제목 스냅샷 */
  movieTitleSnapshot: string
  sortOrder: number
}

export interface FestivalTimetable {
  id: string
  festivalId: string
  imageUrl: string
  /** ISO date "YYYY-MM-DD" — 없으면 "전체" 취급 */
  dayDate: string | null
  label: string | null
  sortOrder: number
}

export interface FestivalDetail extends Festival {
  theaters: FestivalTheaterLink[]
  movies: FestivalMovieLink[]
  timetables: FestivalTimetable[]
}
