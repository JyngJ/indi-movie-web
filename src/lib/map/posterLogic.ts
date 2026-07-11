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
  overflow?: number | string
  countLabel?: string
}

export interface ScreeningDay {
  date: string    // 'YYYY-MM-DD'
  label: string   // '오늘' | '내일' | 'M.D'
  times: string[] // 'HH:MM', 정렬됨
}

// 단일 영화 필터 시 핀에 상영 날짜만 노출하는 줌 임계값 (중간 단계)
export const SHOWTIME_DATES_ZOOM_THRESHOLD = 15
// 단일 영화 필터 시 핀에 날짜별 전체 시간표를 노출하는 줌 임계값 (근접 단계)
export const SHOWTIME_FULL_ZOOM_THRESHOLD = 17

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

export function posterSlotsForZoom(
  movies: TheaterPosterMovie[],
  zoom: number,
  filtersActive = false,
  forceMinOne = false,
): PosterSlot[] {
  const rawCapacity = posterCountForZoom(zoom)
  const capacity = forceMinOne && rawCapacity === 0 ? 1 : rawCapacity
  if (capacity === 0 || movies.length === 0) return []

  // 필터 활성 시엔 매칭되는 영화만 — 안 맞는 영화는 dim 처리해서 같이 보여주지 않고 아예 제외한다
  const sorted = filtersActive ? movies.filter((m) => m.matchesFilter) : movies
  if (sorted.length === 0) return []

  if (capacity === 1) {
    return sorted.length === 1
      ? [{ movie: sorted[0] }]
      : [{ movie: sorted[0], overflow: `${sorted.length}편` }]
  }
  if (sorted.length <= capacity) return sorted.map((m) => ({ movie: m }))

  const visiblePosterCount = capacity - 1
  return [
    ...sorted.slice(0, visiblePosterCount).map((m) => ({ movie: m })),
    { movie: sorted[visiblePosterCount], overflow: sorted.length - visiblePosterCount },
  ]
}
