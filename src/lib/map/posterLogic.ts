export interface TheaterPosterMovie {
  id: string
  title: string
  posterUrl?: string
  genre: string[]
  nation?: string
  director?: string[]
  showtimeCount: number
  hasAvailableSeats: boolean
  matchesFilter: boolean
  showtimesToday?: Array<{ time: string; soldout: boolean; past: boolean }>
}

export interface PosterSlot {
  movie?: TheaterPosterMovie
  /** 필터 불일치지만 자리에 남긴 포스터 — 반투명으로 그린다 (관심 필터 모드) */
  dimmed?: boolean
}

/** 줌 용량만큼 보여줄 포스터와, 자리에 못 들어간 나머지 편수 */
export interface PosterSlotSet {
  slots: PosterSlot[]
  /** 슬롯에 못 담은 영화 수 — 카드 우상단 "+N" 칩으로 표시 */
  overflowCount: number
}

export interface ScreeningDay {
  date: string    // 'YYYY-MM-DD'
  label: string   // '오늘' | '내일' | 'M.D'
  times: string[] // 'HH:MM', 정렬됨
}

// 단일 영화 필터 시 핀에 상영 날짜만/전체 시간표를 노출하는 줌 임계값
// 모바일·태블릿은 화면이 작아 한 화면에 담기는 지도 범위가 넓은 만큼, 더 멀리서도(줌아웃 상태에서도) 보이도록 데스크톱보다 2단계 낮춘다
export function showtimeZoomThresholds(isDesktop: boolean): { dates: number; full: number } {
  return isDesktop ? { dates: 15, full: 17 } : { dates: 13, full: 15 }
}

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토']

export function dayLabel(date: string, todayIso: string): string {
  if (date === todayIso) return '오늘'
  const d = new Date(`${date}T00:00:00`)
  const today = new Date(`${todayIso}T00:00:00`)
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diffDays === 1) return '내일'
  const [, m, day] = date.split('-')
  return `${Number(m)}.${Number(day)}(${WEEKDAY_KO[d.getDay()]})`
}

export function dayOfWeek(date: string): number {
  return new Date(`${date}T00:00:00`).getDay()
}

export function posterCountForZoom(zoom: number): number {
  if (zoom >= 16) return 6
  if (zoom >= 15) return 3
  if (zoom >= 14) return 1
  return 0
}

export function posterSizeForZoom(zoom: number, isDesktop: boolean): { w: number; h: number } {
  if (!isDesktop) {
    if (zoom >= 19) return { w: 66, h: 99 }
    if (zoom >= 18) return { w: 60, h: 90 }
    if (zoom >= 17) return { w: 56, h: 84 }
    return { w: 52, h: 78 }
  }
  if (zoom >= 19) return { w: 126, h: 189 }
  if (zoom >= 18) return { w: 108, h: 162 }
  if (zoom >= 17) return { w: 90, h: 135 }
  return { w: 74, h: 111 }
}

const EMPTY_SLOTS: PosterSlotSet = { slots: [], overflowCount: 0 }

/**
 * 포스터 노출 우선순위 (2026-08-17 확정):
 *   1. 관심 — 관심 영화이거나 관심 감독의 작품
 *   2. 예매 클릭 랭킹 순 (booking rank, 낮을수록 상위)
 *   3. 나머지 (기존 순서 유지)
 * 안정 정렬 — 같은 그룹 안에서는 원래 순서를 지킨다.
 */
export function sortPostersByPriority(
  movies: TheaterPosterMovie[],
  opts?: { favoriteMovieIds?: ReadonlySet<string>; favoriteDirectors?: ReadonlySet<string>; bookingRank?: ReadonlyMap<string, number> },
): TheaterPosterMovie[] {
  if (!opts) return movies
  const { favoriteMovieIds, favoriteDirectors, bookingRank } = opts
  if (!favoriteMovieIds?.size && !favoriteDirectors?.size && !bookingRank?.size) return movies
  const isFav = (m: TheaterPosterMovie) =>
    (favoriteMovieIds?.has(m.id) ?? false) || (m.director ?? []).some((d) => favoriteDirectors?.has(d))
  return movies
    .map((m, i) => ({ m, i, fav: isFav(m), rank: bookingRank?.get(m.id) ?? Number.POSITIVE_INFINITY }))
    .sort((a, b) => (Number(b.fav) - Number(a.fav)) || (a.rank - b.rank) || (a.i - b.i))
    .map((x) => x.m)
}

export function posterSlotsForZoom(
  movies: TheaterPosterMovie[],
  zoom: number,
  filtersActive = false,
  forceMinOne = false,
  /** true면 불일치 영화를 제외하지 않고 뒤로 보내 dimmed로 남긴다 (관심 필터: 지우는 대신 반투명) */
  keepNonMatching = false,
): PosterSlotSet {
  const rawCapacity = posterCountForZoom(zoom)
  const capacity = forceMinOne && rawCapacity === 0 ? 1 : rawCapacity
  if (capacity === 0 || movies.length === 0) return EMPTY_SLOTS

  // 필터 활성 시엔 매칭되는 영화만 — 관심 필터(keepNonMatching)에서는 제외 대신
  // 일치를 앞으로 보내고 나머지를 dimmed로 남긴다 (2026-08-24)
  const sorted = !filtersActive
    ? movies
    : keepNonMatching
      ? [...movies.filter((m) => m.matchesFilter), ...movies.filter((m) => !m.matchesFilter)]
      : movies.filter((m) => m.matchesFilter)
  if (sorted.length === 0) return EMPTY_SLOTS

  // 마지막 칸을 어둡게 덮던 오버플로우 슬롯 폐지 (2026-08-10) — 용량만큼 온전히 보여주고
  // 남는 편수는 카드 우상단 칩으로 뺀다. 포스터를 가리지 않아 같은 자리에서 한 편 더 보인다.
  const visible = sorted.slice(0, capacity)
  const dim = (m: TheaterPosterMovie) => filtersActive && keepNonMatching && !m.matchesFilter
  return { slots: visible.map((m) => ({ movie: m, ...(dim(m) ? { dimmed: true } : {}) })), overflowCount: sorted.length - visible.length }
}
