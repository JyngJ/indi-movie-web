'use client'

import { useEffect, useMemo, useState } from 'react'
import { cookieStorageAdapter } from '@/lib/adapters/cookieStorage'
import { getRecentlyViewed } from '@/lib/curation/recentlyViewed'
import { getRegionFromCity } from '@/lib/regions'
import { calculateDistanceKm } from '@/lib/map/distanceUtils'
import { formatLocalDate, formatLocalTimeHHMM } from '@/lib/date'
import type { LocationCoords } from '@/lib/adapters/location'
import type {
  LastWeekFilm,
  NewIndieFilm,
  RecentlyViewedEntry,
  ReturningFilm,
  SoloTheaterFilm,
  SoloTheaterFilmsByRegion,
  TodayShowFilm,
} from '@/lib/curation/types'
import type { Movie } from '@/types/api'

interface CurationData {
  returningFilms: ReturningFilm[]
  newIndieFilms: NewIndieFilm[]
  lastWeekFilms: LastWeekFilm[]
  /** regionId 기준으로 이미 필터링된 결과 */
  soloTheaterFilms: SoloTheaterFilm[]
  todayShowFilms: TodayShowFilm[]
  recentlyViewed: RecentlyViewedEntry[]
}

const EMPTY_CACHE: Pick<CurationData, 'returningFilms' | 'newIndieFilms' | 'lastWeekFilms'> & { soloTheaterFilmsByRegion: SoloTheaterFilmsByRegion } = {
  returningFilms: [],
  newIndieFilms: [],
  lastWeekFilms: [],
  soloTheaterFilmsByRegion: {},
}

/** "지금 출발하면" 최소 여유시간(분) — 이동 시간 고려, 이 안에 시작하는 회차는 제외 */
const DEPARTURE_BUFFER_MIN = 30

/** "지금 출발하면" 최대 범위(시간) — 지금으로부터 이 시간 이내에 시작하는 회차만 노출 */
const LEAVE_NOW_WINDOW_HOURS = 4

interface RawTodayShowtime {
  movieId: string
  showTime: string
  theaterId: string
  theater: { id: string; name: string; city: string; lat?: number; lng?: number } | null
  movie: Movie | null
}

/** curation_cache에서 서버 계산 스냅샷 읽기 + 오늘 회차/최근 찾아본 클라이언트 로드.
 *  refreshKey가 바뀌면 최근 찾아본 재로드 + "지금 출발하면" 시각 필터를 다시 계산.
 */
export function useCurationData(open: boolean, regionId: string | null, refreshKey = 0, userCoords?: LocationCoords | null): CurationData {
  const [cacheData, setCacheData] = useState(EMPTY_CACHE)
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedEntry[]>([])
  const [todayShowtimes, setTodayShowtimes] = useState<RawTodayShowtime[]>([])

  // curation_cache 스냅샷 — open 첫 진입 시 1회
  // /api/public/curation-cache 서버 라우트 경유 — CDN 캐시로 Supabase egress 절감
  useEffect(() => {
    if (!open) return
    let cancelled = false
    fetch('/api/public/curation-cache')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return
        setCacheData({
          returningFilms: (data.returningFilms as ReturningFilm[]) ?? [],
          newIndieFilms: (data.newIndieFilms as NewIndieFilm[]) ?? [],
          lastWeekFilms: (data.lastWeekFilms as LastWeekFilm[]) ?? [],
          soloTheaterFilmsByRegion: (data.soloTheaterFilmsByRegion as SoloTheaterFilmsByRegion) ?? {},
        })
      }, () => {})
    return () => { cancelled = true }
  }, [open])

  // 오늘 전체 회차 — open 첫 진입 시 1회 (시간 필터는 클라이언트에서 refreshKey마다 재계산)
  // /api/public/showtimes-window 서버 라우트 경유 — CDN 캐시로 Supabase egress 절감
  useEffect(() => {
    if (!open) return
    let cancelled = false
    const today = formatLocalDate(new Date())
    fetch(`/api/public/showtimes-window?from=${today}&to=${today}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((rows: Array<{ movieId: string; showTime: string; theaterId: string; theater: RawTodayShowtime['theater']; movie: Movie | null }>) => {
        if (cancelled) return
        setTodayShowtimes(rows.map((r) => ({
          movieId: r.movieId,
          showTime: r.showTime,
          theaterId: r.theaterId,
          theater: r.theater,
          movie: r.movie,
        })))
      }, () => {})
    return () => { cancelled = true }
  }, [open])

  // 최근 찾아본 — refreshKey 바뀔 때마다 재로드 (쿠키 읽기라 빠름)
  useEffect(() => {
    if (!open) return
    Promise.all([
      getRecentlyViewed(cookieStorageAdapter, 'movie'),
      getRecentlyViewed(cookieStorageAdapter, 'theater'),
      getRecentlyViewed(cookieStorageAdapter, 'director'),
    ]).then(([movies, theaters, directors]) => {
      const all: RecentlyViewedEntry[] = [
        ...movies.map(e => ({ ...e, kind: 'movie' as const })),
        ...theaters.map(e => ({ ...e, kind: 'theater' as const })),
        ...directors.map(e => ({ ...e, kind: 'director' as const })),
      ].sort((a, b) => (b.viewedAt ?? 0) - (a.viewedAt ?? 0))
      setRecentlyViewed(all)
    }).catch(() => {})
  }, [open, refreshKey])

  // "지금 출발하면 볼 수 있는" — 오늘 회차 중 (현재 시각 + 버퍼) 이후 시작하는 회차만, 영화별 가장 빠른 1건
  const todayShowFilms = useMemo<TodayShowFilm[]>(() => {
    const cutoff = new Date(Date.now() + DEPARTURE_BUFFER_MIN * 60 * 1000)
    const cutoffHHMM = formatLocalTimeHHMM(cutoff)
    const windowEnd = new Date(Date.now() + LEAVE_NOW_WINDOW_HOURS * 60 * 60 * 1000)
    const windowEndHHMM = formatLocalTimeHHMM(windowEnd)

    const byMovie = new Map<string, TodayShowFilm>()
    for (const row of todayShowtimes) {
      if (row.showTime <= cutoffHHMM) continue
      if (row.showTime > windowEndHHMM) continue
      if (byMovie.has(row.movieId)) continue
      const movie = row.movie
      const theater = row.theater
      if (!movie || !theater) continue
      if (regionId && getRegionFromCity(theater.city) !== regionId) continue
      byMovie.set(row.movieId, {
        movie,
        nextShowTime: row.showTime.slice(0, 5),
        theaterId: theater.id,
        theaterName: theater.name,
        theaterLat: Number(theater.lat),
        theaterLng: Number(theater.lng),
      })
    }
    const films = [...byMovie.values()]
    // 위치 권한이 있으면 가까운 극장 순, 없으면 빠른 회차 순
    if (userCoords) {
      return films.sort((a, b) => {
        const distA = calculateDistanceKm(userCoords.lat, userCoords.lng, a.theaterLat, a.theaterLng) ?? Infinity
        const distB = calculateDistanceKm(userCoords.lat, userCoords.lng, b.theaterLat, b.theaterLng) ?? Infinity
        return distA - distB
      })
    }
    return films.sort((a, b) => a.nextShowTime.localeCompare(b.nextShowTime))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayShowtimes, regionId, refreshKey, userCoords])

  const soloTheaterFilms = useMemo<SoloTheaterFilm[]>(() => {
    if (!regionId) return []
    return cacheData.soloTheaterFilmsByRegion[regionId] ?? []
  }, [cacheData.soloTheaterFilmsByRegion, regionId])

  // 검색 지역이 설정되어 있으면 해당 지역에서 상영 중인 영화만 노출
  const returningFilms = useMemo(() => (
    regionId ? cacheData.returningFilms.filter(film => film.regions?.includes(regionId)) : cacheData.returningFilms
  ), [cacheData.returningFilms, regionId])

  const newIndieFilms = useMemo(() => (
    regionId ? cacheData.newIndieFilms.filter(film => film.regions?.includes(regionId)) : cacheData.newIndieFilms
  ), [cacheData.newIndieFilms, regionId])

  const lastWeekFilms = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return cacheData.lastWeekFilms.filter((film) => {
      if (film.maxShowDate < today) return false   // 이미 종영 — 제거
      if (regionId && !film.regions?.includes(regionId)) return false
      return true
    })
  }, [cacheData.lastWeekFilms, regionId])

  return {
    returningFilms,
    newIndieFilms,
    lastWeekFilms,
    soloTheaterFilms,
    todayShowFilms,
    recentlyViewed,
  }
}
