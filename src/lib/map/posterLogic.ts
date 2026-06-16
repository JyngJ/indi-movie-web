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
  dimmed?: boolean
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

  const sorted = filtersActive
    ? [...movies].sort((a, b) => Number(b.matchesFilter) - Number(a.matchesFilter))
    : movies

  const dim = (m: TheaterPosterMovie) => filtersActive && !m.matchesFilter

  if (capacity === 1) {
    return sorted.length === 1
      ? [{ movie: sorted[0], dimmed: dim(sorted[0]) }]
      : [{ movie: sorted[0], overflow: `${sorted.length}편`, dimmed: dim(sorted[0]) }]
  }
  if (sorted.length <= capacity) return sorted.map((m) => ({ movie: m, dimmed: dim(m) }))

  const visiblePosterCount = capacity - 1
  return [
    ...sorted.slice(0, visiblePosterCount).map((m) => ({ movie: m, dimmed: dim(m) })),
    { movie: sorted[visiblePosterCount], overflow: sorted.length - visiblePosterCount, dimmed: dim(sorted[visiblePosterCount]) },
  ]
}
