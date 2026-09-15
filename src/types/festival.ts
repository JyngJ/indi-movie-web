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

export interface FestivalScreening {
  id: string
  festivalId: string
  /** ISO date "YYYY-MM-DD" */
  screeningDate: string
  /** "HH:MM" — 초는 버린다 */
  startTime: string
  runtimeMin: number | null
  /** festival_theaters 링크 — 끊겨도(SET NULL) venueLabel은 남는다 */
  festivalTheaterId: string | null
  /** 극장 이름 표기 스냅샷 */
  venueLabel: string
  /** 관 이름 — 멀티스크린 극장에서만 */
  screenLabel: string | null
  movieId: string | null
  movieTitleSnapshot: string
  section: string | null
  /** 영화제 상영코드 — 관객이 이 코드로 회차를 지칭한다 */
  screeningCode: string | null
  hasGv: boolean
  bookingUrl: string | null
}

export interface FestivalDetail extends Festival {
  theaters: FestivalTheaterLink[]
  movies: FestivalMovieLink[]
  timetables: FestivalTimetable[]
  /** 구조화된 회차 — 0개면 상세 페이지가 timetables(이미지)로 폴백한다 */
  screenings: FestivalScreening[]
}
