'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toKstIsoDate } from '@/lib/date'
import { useTheaterAllMovies, useTheaterShowtimes, THEATER_MOVIES_WINDOW_DAYS } from '@/lib/supabase/queries'
import { snapshotUpdatedAt } from '@/lib/catalog/ssrSnapshot'
import { initialScreeningDate } from '@/lib/catalog/initialScreeningDate'
import type { TheaterInitialShowtimes } from '@/lib/catalog/getTheaterShowtimesCached'
import {
  collectActiveDates,
  groupShowtimesByMovie,
  isSelectableKind,
  scheduleDates,
  showtimeKind,
  type ScheduleClock,
} from '@/lib/theater/schedule'
import type { Showtime } from '@/types/api'

/** 날짜 탭 최소 칸 수 — 상영일이 며칠뿐이어도 한 주는 보여 준다 */
const MIN_DATE_TABS = 7

function currentMinutes() {
  const n = new Date()
  return n.getHours() * 60 + n.getMinutes()
}

/**
 * 극장 하루치 시간표 상태 — 지도 극장 시트와 상영작 탭 극장 페이지가 같이 쓴다.
 * 날짜를 먼저 고르고, 그날 상영하는 영화를 회차와 함께 묶어 돌려준다.
 */
export function useTheaterSchedule({
  theaterId,
  initialDate,
  initialShowtimeId,
  seed,
}: {
  theaterId: string
  /** 지정하면 첫 날짜 자동 결정을 건너뛴다 */
  initialDate?: string
  initialShowtimeId?: string | null
  /** 서버가 미리 읽은 오늘 시간표 */
  seed?: TheaterInitialShowtimes | null
}) {
  const today = useMemo(() => toKstIsoDate(new Date()), [])
  const [selectedDate, setSelectedDate] = useState(initialDate ?? today)
  const [selectedShowtimeId, setSelectedShowtimeId] = useState<string | null>(initialShowtimeId ?? null)
  /* 사용자가 고른 날짜·공유 회차는 자동 결정이 덮지 않는다 */
  const dateResolvedRef = useRef(Boolean(initialDate))

  /* 서버의 '오늘'(KST)과 브라우저의 오늘이 같을 때만 쓴다 — 자정 무렵 캐시된 페이지에선 키가 어긋난다 */
  const [seedUpdatedAt] = useState(() => (seed ? snapshotUpdatedAt(seed.fetchedAt, Date.now()) : 0))
  const usableSeed = seed && seed.date === today ? seed : null

  const moviesQuery = useTheaterAllMovies(
    theaterId,
    usableSeed ? { data: usableSeed.movies, updatedAt: seedUpdatedAt } : undefined,
  )
  const dayQuery = useTheaterShowtimes(
    theaterId,
    selectedDate,
    usableSeed && selectedDate === usableSeed.date ? { data: usableSeed.day, updatedAt: seedUpdatedAt } : undefined,
  )

  const allMovieEntries = useMemo(() => moviesQuery.data ?? [], [moviesQuery.data])
  const moviesLoading = moviesQuery.isLoading || (moviesQuery.isFetching && !moviesQuery.data)
  const moviesError = moviesQuery.isError && !moviesQuery.data
  const dayShowtimes = useMemo(() => dayQuery.data?.showtimes ?? [], [dayQuery.data])
  const showtimesLoading = dayQuery.isLoading || (dayQuery.isFetching && !dayQuery.data)
  const showtimesError = dayQuery.isError && !dayQuery.data

  const activeDates = useMemo(() => collectActiveDates(allMovieEntries), [allMovieEntries])

  /* 상영 있는 마지막 날까지만 탭을 둔다 — 빈 탭이 줄줄이 이어지지 않게 */
  const dates = useMemo(() => {
    const all = scheduleDates(today, THEATER_MOVIES_WINDOW_DAYS)
    const last = [...activeDates].sort().at(-1)
    const count = last ? Math.max(MIN_DATE_TABS, all.indexOf(last) + 1) : MIN_DATE_TABS
    const shown = all.slice(0, count)
    /* 공유 링크로 범위 밖 날짜에 들어와도 탭이 보이게 */
    return shown.includes(selectedDate) ? shown : [...shown, selectedDate].sort()
  }, [today, activeDates, selectedDate])

  /* 첫 진입: 오늘 회차가 남았으면 오늘, 다 끝났거나 없으면 다음 상영일 */
  useEffect(() => {
    if (dateResolvedRef.current || moviesLoading || activeDates.size === 0) return
    if (activeDates.has(today) && (dayQuery.isLoading || !dayQuery.data)) return
    dateResolvedRef.current = true
    const next = initialScreeningDate(activeDates, dayQuery.data?.showtimes ?? [], new Date())
    if (next && next !== selectedDate) setSelectedDate(next)
  }, [activeDates, moviesLoading, dayQuery.isLoading, dayQuery.data, today, selectedDate])

  /* 오늘 탭에서 지난 회차를 가르는 시계 — 1분마다 */
  const [nowMinutes, setNowMinutes] = useState(currentMinutes)
  useEffect(() => {
    const id = setInterval(() => setNowMinutes(currentMinutes()), 60_000)
    return () => clearInterval(id)
  }, [])
  const isToday = selectedDate === today
  const clock: ScheduleClock = useMemo(() => ({ isToday, nowMinutes }), [isToday, nowMinutes])

  const groups = useMemo(() => {
    const movies = [...(dayQuery.data?.movies ?? []), ...allMovieEntries.map((e) => e.movie)]
    return groupShowtimesByMovie(movies, dayShowtimes, clock)
  }, [dayQuery.data, allMovieEntries, dayShowtimes, clock])

  const selectedShowtime: Showtime | null = useMemo(
    () => dayShowtimes.find((s) => s.id === selectedShowtimeId) ?? null,
    [dayShowtimes, selectedShowtimeId],
  )

  const selectDate = useCallback((date: string, opts?: { keepShowtime?: boolean }) => {
    dateResolvedRef.current = true
    setSelectedDate(date)
    if (!opts?.keepShowtime) setSelectedShowtimeId(null)
  }, [])

  /** 고를 수 없는 회차는 무시하고, 같은 회차를 다시 누르면 선택을 푼다. 새로 고른 회차를 돌려준다. */
  const toggleShowtime = useCallback((st: Showtime): Showtime | null => {
    if (!isSelectableKind(showtimeKind(st, clock))) return null
    const next = selectedShowtimeId === st.id ? null : st
    setSelectedShowtimeId(next?.id ?? null)
    return next
  }, [clock, selectedShowtimeId])

  return {
    today,
    dates,
    selectedDate,
    selectDate,
    isToday,
    clock,
    activeDates,
    allMovieEntries,
    moviesLoading,
    moviesError,
    retryMovies: moviesQuery.refetch,
    dayShowtimes,
    groups,
    showtimesLoading,
    showtimesError,
    retryShowtimes: dayQuery.refetch,
    selectedShowtimeId,
    selectedShowtime,
    selectShowtime: setSelectedShowtimeId,
    toggleShowtime,
  }
}

export type TheaterSchedule = ReturnType<typeof useTheaterSchedule>
