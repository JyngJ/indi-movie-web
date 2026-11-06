/**
 * 극장 상영 시간표 — 순수 규칙 (React·Supabase 의존 금지).
 *
 * 지도 극장 시트와 상영작 탭 극장 페이지가 같은 판정을 쓴다. 예전엔 회차 상태 판정이
 * 시트·극장 페이지·영화 상세 세 곳에 복붙돼 있었다.
 */
import { addDaysIso } from '@/lib/date'
import { isSoldOut } from '@/lib/catalog/seatAvailability'
import { normalizeGenre } from '@/lib/genres'

export type ShowtimeKind = 'normal' | 'low' | 'soldout' | 'late' | 'nowplaying' | 'ended'

type Timed = { showTime: string; endTime?: string | null }
type Seated = Timed & { seatAvailable: number; seatTotal: number }

/** 종료 시각을 모르면 시작 + 120분으로 본다 */
const DEFAULT_RUNTIME_MIN = 120
/** 이 비율 이하이면 잔여석 적음(kind=low) — 기존 화면 판정(10%)을 그대로 옮겼다 */
const LOW_SEAT_RATIO = 0.1
/** 이 시각(시) 이후 시작은 심야 */
const LATE_START_HOUR = 21

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function showtimeEndMinutes(st: Timed): number {
  return st.endTime ? timeToMinutes(st.endTime) : timeToMinutes(st.showTime) + DEFAULT_RUNTIME_MIN
}

export interface ScheduleClock {
  /** 선택한 날짜가 오늘인지 — 오늘만 지난 회차·상영 중을 가른다 */
  isToday: boolean
  /** 0시부터 지난 분 */
  nowMinutes: number
}

export function showtimeKind(st: Seated, { isToday, nowMinutes }: ScheduleClock): ShowtimeKind {
  const start = timeToMinutes(st.showTime)
  const end = showtimeEndMinutes(st)
  if (isToday && end <= nowMinutes) return 'ended'
  if (isToday && start < nowMinutes && end > nowMinutes) return 'nowplaying'
  if (isSoldOut(st.seatAvailable, st.seatTotal)) return 'soldout'
  if (st.seatTotal > 0 && st.seatAvailable <= st.seatTotal * LOW_SEAT_RATIO) return 'low'
  if (Math.floor(start / 60) >= LATE_START_HOUR) return 'late'
  return 'normal'
}

/** 고를 수 있는 회차 — 매진·상영 중·종료는 예매로 이어지지 않는다 */
export function isSelectableKind(kind: ShowtimeKind): boolean {
  return kind !== 'soldout' && kind !== 'nowplaying' && kind !== 'ended'
}

export interface MovieShowtimeGroup<M, S> {
  movie: M
  showtimes: S[]
}

/**
 * 하루치 회차를 영화별로 묶는다.
 * 정렬: 지금 볼 수 있는 회차가 있는 영화 → 남은 회차가 전부 매진 → 전부 종료, 같은 등급은 첫 회차 시각 순.
 * movies에 없는 영화의 회차는 버린다.
 */
export function groupShowtimesByMovie<M extends { id: string }, S extends Seated & { movieId: string }>(
  movies: readonly M[],
  showtimes: readonly S[],
  clock: ScheduleClock,
): MovieShowtimeGroup<M, S>[] {
  const movieById = new Map<string, M>()
  for (const m of movies) if (!movieById.has(m.id)) movieById.set(m.id, m)

  const byMovie = new Map<string, S[]>()
  for (const st of showtimes) {
    if (!movieById.has(st.movieId)) continue
    const list = byMovie.get(st.movieId)
    if (list) list.push(st)
    else byMovie.set(st.movieId, [st])
  }

  const ended = (st: S) => clock.isToday && showtimeEndMinutes(st) <= clock.nowMinutes
  const rank = (sts: S[]) => {
    const remaining = sts.filter((st) => !ended(st))
    if (remaining.length === 0) return 2
    if (remaining.every((st) => isSoldOut(st.seatAvailable, st.seatTotal))) return 1
    return 0
  }

  return [...byMovie].map(([id, sts]) => ({
    movie: movieById.get(id)!,
    showtimes: [...sts].sort((a, b) => timeToMinutes(a.showTime) - timeToMinutes(b.showTime)),
  })).sort((a, b) => {
    const d = rank(a.showtimes) - rank(b.showtimes)
    if (d !== 0) return d
    return timeToMinutes(a.showtimes[0].showTime) - timeToMinutes(b.showtimes[0].showTime)
  })
}

/** today부터 days일 — ISO 날짜 문자열 */
export function scheduleDates(today: string, days: number): string[] {
  return Array.from({ length: days }, (_, i) => addDaysIso(today, i))
}

/** 영화별 상영일 목록에서 극장 전체의 상영일 집합 */
export function collectActiveDates(entries: readonly { availableDates: ReadonlySet<string> }[]): Set<string> {
  const set = new Set<string>()
  for (const e of entries) for (const d of e.availableDates) set.add(d)
  return set
}

/** 영화 하나를 보려고 옮겨 갈 날짜 — 지금 날짜에 상영하면 그대로, 아니면 그 뒤 첫 상영일, 없으면 마지막 상영일 */
export function dateForMovie(availableDates: ReadonlySet<string>, current: string): string | undefined {
  if (availableDates.has(current)) return current
  const sorted = [...availableDates].sort()
  return sorted.find((d) => d > current) ?? sorted.at(-1)
}

export interface ScheduleMovieFilter {
  genres: readonly string[]
  nations: readonly string[]
  /** 고를 수 있는 회차가 하나라도 있는 영화만 */
  bookable: boolean
}

export const EMPTY_SCHEDULE_FILTER: ScheduleMovieFilter = { genres: [], nations: [], bookable: false }

export function splitNations(nation: string | null | undefined): string[] {
  return nation?.split(/[,，/·]+/).map((x) => x.trim()).filter(Boolean) ?? []
}

export function isFilterActive(f: ScheduleMovieFilter): boolean {
  return f.genres.length > 0 || f.nations.length > 0 || f.bookable
}

export function filterMovieGroups<M extends { genre: readonly string[]; nation?: string | null }, S extends Seated>(
  groups: readonly MovieShowtimeGroup<M, S>[],
  filter: ScheduleMovieFilter,
  clock: ScheduleClock,
): MovieShowtimeGroup<M, S>[] {
  if (!isFilterActive(filter)) return [...groups]
  return groups.filter(({ movie, showtimes }) => {
    const genreOk = filter.genres.length === 0 || movie.genre.some((g) => {
      const n = normalizeGenre(g)
      return n !== null && filter.genres.includes(n)
    })
    const nationOk = filter.nations.length === 0 || splitNations(movie.nation).some((n) => filter.nations.includes(n))
    const bookableOk = !filter.bookable || showtimes.some((st) => isSelectableKind(showtimeKind(st, clock)))
    return genreOk && nationOk && bookableOk
  })
}
