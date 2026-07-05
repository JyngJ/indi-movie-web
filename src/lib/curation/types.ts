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
  /** 현재 이 영화를 상영 중인 지역 목록 — 검색 지역 필터에 사용 */
  regions: string[]
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
  /** 현재 이 영화를 상영 중인 지역 목록 — 검색 지역 필터에 사용 */
  regions: string[]
}

// ─────────────────────────────────────────────
// 이번 주가 마지막 (ending soon)
// 기준: max(show_date) ≤ today + 7일
// ─────────────────────────────────────────────

/**
 * 'confirmed' — 상영 중인 모든 극장이 통상 공개 리드타임보다 먼 미래까지 시간표를 공개했는데도
 *   이 영화가 없음(+ KOBIS 매칭 실패 또는 스크린 수 감소 추세) — 진짜 종영으로 볼 근거가 있음.
 * 'likely' — 위 근거가 부족함(리드타임 미상 극장 포함, 또는 KOBIS가 증가/유지 추세를 보임).
 *   데이터 부재를 종영으로 오독했을 수 있어 단정 표현을 쓰지 않는다.
 */
export type LastWeekConfidence = 'confirmed' | 'likely'

export interface LastWeekFilm {
  movie: Movie
  /** ISO date "YYYY-MM-DD" — 이 영화의 마지막 상영일 */
  maxShowDate: string
  /** 오늘 기준 남은 일수 (0 = 오늘이 마지막) */
  daysLeft: number
  /** 예: "D-3 막바지 상영" / "오늘이 마지막" — 레거시 캐시 호환용, UI는 getLastWeekBadgeText 사용 */
  badgeText: string
  /** 레거시 캐시 JSON엔 없는 필드일 수 있음 — 읽는 쪽은 반드시 ?? 'likely'로 안전하게 폴백할 것 */
  confidence?: LastWeekConfidence
  /** 현재 이 영화를 상영 중인 지역 목록 — 검색 지역 필터에 사용 */
  regions: string[]
}

// ─────────────────────────────────────────────
// 극장별 공개 리드타임 — "이번 주가 마지막" 오탐 방지용
// 기준: 크롤 시점(created_at) 대비 며칠 앞의 show_date까지 공개돼 있었나
// ─────────────────────────────────────────────

export interface TheaterLeadtimeSample {
  /** ISO date "YYYY-MM-DD" */
  showDate: string
  /** show_date row가 처음 생성된 시각 (ISO datetime) */
  createdAt: string
}

// ─────────────────────────────────────────────
// 매진 임박 (almost sold out)
// 기준: 오늘~내일 회차 중 seat_total > 0 && 잔여율 ≤ LOW_SEAT_RATIO_THRESHOLD
// 주의: 좌석 수는 크롤 시점 스냅샷 — UI 카피에서 실시간 단정 금지
// ─────────────────────────────────────────────

/** 판정 입력 — 좌석 스냅샷이 포함된 오늘~내일 회차 1건 */
export interface AlmostSoldOutCandidate {
  movie: Movie
  theaterId: string
  theaterName: string
  /** 극장 도시 — 검색 지역 필터에 사용 (지역 매핑은 호출부 책임) */
  theaterCity: string
  /** ISO date "YYYY-MM-DD" */
  showDate: string
  /** "HH:MM" 또는 "HH:MM:SS" */
  showTime: string
  seatAvailable: number
  seatTotal: number
}

/** 매진 임박 판정된 회차 1건 (영화 그룹 내부) */
export interface AlmostSoldOutShowing {
  theaterId: string
  theaterName: string
  /** ISO date "YYYY-MM-DD" */
  showDate: string
  /** "HH:MM" */
  showTime: string
  seatAvailable: number
  seatTotal: number
}

export interface AlmostSoldOutFilm {
  movie: Movie
  /** 날짜+시간 오름차순 정렬된 매진 임박 회차 목록 */
  showings: AlmostSoldOutShowing[]
}

// ─────────────────────────────────────────────
// 선택 지역에서 단 한 곳 (solo theater in region)
// 기준: 선택 지역 내 상영 극장 수 = 1
// ─────────────────────────────────────────────

export interface SoloTheaterFilm {
  movie: Movie
  theaterId: string
  theaterName: string
  theaterCity: string
}

/** curation_cache.solo_theater_films 의 형태 — regionId 키별 배열 */
export type SoloTheaterFilmsByRegion = Record<string, SoloTheaterFilm[]>

// ─────────────────────────────────────────────
// 지금 출발하면 볼 수 있는 (today upcoming shows)
// 기준: 오늘 show_date + show_time > 현재 시각 + 버퍼
// ─────────────────────────────────────────────

export interface TodayShowFilm {
  movie: Movie
  /** 가장 이른 남은 회차 시간 "HH:MM" */
  nextShowTime: string
  theaterId: string
  theaterName: string
  theaterLat: number
  theaterLng: number
}

// ─────────────────────────────────────────────
// 최근 찾아본 영화 / 영화관 (recently viewed)
// 저장 위치: 쿠키(클라이언트 only, 계정 동기화는 추후 별도)
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// 영화 탭 큐레이션 리스트 (curation_list 테이블)
// docs/FILMS_TAB_PLAN.md §4, §6 참고
// ─────────────────────────────────────────────

export interface CurationListQuery {
  /** movie.genre[]와 하나 이상 겹치면 매치 */
  genre?: string[]
  /** [start, end] — movie.year 포함 범위 */
  yearRange?: [number, number]
}

export interface CurationListRow {
  listId: string
  nameKo: string
  type: 'dynamic' | 'static'
  query: CurationListQuery | null
  memberIds: string[] | null
  priorityTier: 1 | 2 | 3
  seasonTrigger: { start: string; end: string } | null
  minN: number | null
}

export type RecentlyViewedKind = 'movie' | 'theater' | 'director'

export interface RecentlyViewedEntry {
  id: string
  title: string
  /** 영화는 포스터 키, 영화관은 마커/썸네일 키 — 도메인엔 불투명한 표시용 값 */
  thumbnailKey?: string
  /** useCurationData에서 합칠 때 태깅 — 스토리지엔 저장 안 함 */
  kind?: RecentlyViewedKind
  /** Date.now() — 최신순 정렬용, 구버전 항목엔 없을 수 있음 */
  viewedAt?: number
}
