import { useQuery } from '@tanstack/react-query'
import type { AlmostSoldOutCandidate, CurationListRow, LateNightCandidate } from '@/lib/curation/types'
import type { Theater, Movie, Showtime, Station } from '@/types/api'
import type { TheaterEvent } from '@/types/admin'
import { createSupabaseBrowserClient } from './browser'
import { movieRowToMovie } from './movieRow'
import { formatLocalDate } from '@/lib/date'
import { getRegionFromCity } from '@/lib/regions'
import { getMovieTheaterShowtimes as getMovieTheaterShowtimesPure } from '@/lib/catalog/getMovieTheaterShowtimes'
import type { MovieTheaterEntry } from '@/lib/catalog/getMovieTheaterShowtimes'

function supabase() {
  return createSupabaseBrowserClient()
}



/* ── 영화관 목록 ────────────────────────────────────────────────── */
export function useTheaters() {
  return useQuery<Theater[]>({
    queryKey: ['theaters'],
    queryFn: async () => {
      const res = await fetch('/api/public/theaters')
      if (!res.ok) throw new Error(`theaters fetch 실패: ${res.status}`)
      return res.json()
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 120 * 60 * 1000,
  })
}

/* ── 지하철역 목록 ─────────────────────────────────────────────── */
export function useStations() {
  return useQuery<Station[]>({
    queryKey: ['stations'],
    queryFn: async () => {
      const res = await fetch('/api/public/stations')
      if (!res.ok) throw new Error(`stations fetch 실패: ${res.status}`)
      return res.json()
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 120 * 60 * 1000,
  })
}

/* ── 극장 이벤트(GV·토크 등) 목록 ──────────────────────────────── */
export function useTheaterEvents() {
  return useQuery<TheaterEvent[]>({
    queryKey: ['theater-events'],
    queryFn: async () => {
      const res = await fetch('/api/public/theater-events')
      if (!res.ok) throw new Error(`theater-events fetch 실패: ${res.status}`)
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}

/* ── 영화 목록 (경량 — 지도/검색용) ────────────────────────────── */
// synopsis, runtime, certification, cast 는 movie_details 테이블로 분리됨
export function useMovies() {
  return useQuery<Movie[]>({
    queryKey: ['movies'],
    queryFn: async () => {
      const { data, error } = await supabase()
        .from('movies')
        .select('id,title,original_title,year,poster_url,genre,director,nation,kmdb_id,tmdb_id,rating')
        .order('title')

      if (error) throw error

      return (data ?? []).map((r) => movieRowToMovie(r as Record<string, unknown>))
    },
    staleTime: 60 * 60 * 1000,
  })
}

/* ── 영화 상세 (movie_details 조인) ────────────────────────────── */
export interface MovieDetail extends Movie {
  synopsis?: string
  runtimeMinutes?: number
  certification?: string
  cast: Array<{ name: string; character?: string; profileUrl?: string }>
}

export function useMovieDetail(movieId: string | null, initialData?: MovieDetail) {
  return useQuery<MovieDetail | null>({
    queryKey: ['movie-detail', movieId],
    enabled: !!movieId,
    initialData: initialData ?? undefined,
    queryFn: async () => {
      const { data, error } = await supabase()
        .from('movies')
        .select(`
          id, title, original_title, year, poster_url, genre, director,
          nation, kmdb_id, tmdb_id, rating,
          movie_details (
            synopsis,
            runtime_minutes,
            certification,
            cast_members
          )
        `)
        .eq('id', movieId!)
        .single()

      if (error) throw error
      if (!data) return null

      const row = data as Record<string, unknown>
      const details = row.movie_details as Record<string, unknown> | null

      return {
        id: String(row.id),
        title: String(row.title),
        originalTitle: row.original_title ? String(row.original_title) : undefined,
        year: Number(row.year),
        posterUrl: row.poster_url ? String(row.poster_url) : undefined,
        genre: (row.genre as string[] | null) ?? [],
        director: (row.director as string[] | null) ?? [],
        nation: row.nation ? String(row.nation) : undefined,
        kmdbId: row.kmdb_id ? String(row.kmdb_id) : undefined,
        tmdbId: row.tmdb_id ? Number(row.tmdb_id) : undefined,
        rating: row.rating ? Number(row.rating) : undefined,
        synopsis: details?.synopsis ? String(details.synopsis) : undefined,
        runtimeMinutes: details?.runtime_minutes ? Number(details.runtime_minutes) : undefined,
        certification: details?.certification ? String(details.certification) : undefined,
        cast: (details?.cast_members as MovieDetail['cast'] | null) ?? [],
      }
    },
    staleTime: 10 * 60 * 1000,
  })
}

/* ── 오늘 포함 미래 상영 스케줄이 있는 영화 ID 목록 ─────────────── */
export function useActiveMovieIds() {
  const today = formatLocalDate(new Date())

  return useQuery<string[]>({
    queryKey: ['active-movie-ids', today],
    queryFn: async () => {
      const { data, error } = await supabase()
        .from('showtimes')
        .select('movie_id')
        .eq('is_active', true)
        .gte('show_date', today)

      if (error) throw error

      return Array.from(new Set((data ?? []).map((r) => r.movie_id).filter(Boolean)))
    },
    staleTime: 2 * 60 * 1000,
  })
}

/** 지역 필터링된 활성 상영작 ID 목록 (regionId=null이면 전국) */
export function useActiveMovieIdsByRegion(regionId: string | null) {
  const today = formatLocalDate(new Date())
  const { data: theaters = [] } = useTheaters()

  const theaterIds = regionId
    ? theaters.filter((t) => getRegionFromCity(t.city) === regionId).map((t) => t.id)
    : null

  return useQuery<string[]>({
    queryKey: ['active-movie-ids-region', today, regionId ?? 'all'],
    queryFn: async () => {
      if (theaterIds !== null && theaterIds.length === 0) return []

      let q = supabase()
        .from('showtimes')
        .select('movie_id')
        .eq('is_active', true)
        .gte('show_date', today)

      if (theaterIds !== null) q = q.in('theater_id', theaterIds)

      const { data, error } = await q
      if (error) throw error
      return Array.from(new Set((data ?? []).map((r) => r.movie_id).filter(Boolean)))
    },
    staleTime: 2 * 60 * 1000,
    enabled: regionId === null || theaters.length > 0,
  })
}

/** 오늘 이후 활성 상영 (movie_id, theater_id) 쌍 — 중복 제거. 특별전 계산에 사용. */
export function useActiveMovieTheaterPairs(regionId: string | null) {
  const today = formatLocalDate(new Date())
  const { data: theaters = [] } = useTheaters()

  const theaterIds = regionId
    ? theaters.filter((t) => getRegionFromCity(t.city) === regionId).map((t) => t.id)
    : null

  return useQuery<{ movieId: string; theaterId: string }[]>({
    queryKey: ['active-movie-theater-pairs', today, regionId ?? 'all'],
    queryFn: async () => {
      if (theaterIds !== null && theaterIds.length === 0) return []

      let q = supabase()
        .from('showtimes')
        .select('movie_id, theater_id')
        .eq('is_active', true)
        .gte('show_date', today)

      if (theaterIds !== null) q = q.in('theater_id', theaterIds)

      const { data, error } = await q
      if (error) throw error

      const seen = new Set<string>()
      const result: { movieId: string; theaterId: string }[] = []
      for (const r of data ?? []) {
        const key = `${r.theater_id}:${r.movie_id}`
        if (seen.has(key)) continue
        seen.add(key)
        result.push({ movieId: r.movie_id, theaterId: r.theater_id })
      }
      return result
    },
    staleTime: 2 * 60 * 1000,
    enabled: regionId === null || theaters.length > 0,
  })
}

/* ── 영화 탭 큐레이션 리스트 (curation_list 테이블) ─────────────── */
export function useCurationLists() {
  return useQuery<CurationListRow[]>({
    queryKey: ['curation-lists'],
    queryFn: async () => {
      const { data, error } = await supabase()
        .from('curation_list')
        .select('list_id, name_ko, type, query, member_ids, priority_tier, season_trigger, min_n')

      if (error) throw error

      return (data ?? []).map((r) => ({
        listId: r.list_id,
        nameKo: r.name_ko,
        type: r.type as CurationListRow['type'],
        query: (r.query as CurationListRow['query']) ?? null,
        memberIds: (r.member_ids as string[] | null) ?? null,
        priorityTier: r.priority_tier as CurationListRow['priorityTier'],
        seasonTrigger: (r.season_trigger as CurationListRow['seasonTrigger']) ?? null,
        minN: r.min_n ?? null,
      }))
    },
    staleTime: 60 * 60 * 1000,
  })
}

/* ── 심야 상영 후보 회차 (오늘~D+7) ─────────────────────────────── */
// 심야 시각 판정은 순수 함수(src/lib/curation/getLateNightFilms.ts) 책임 —
// 자정 넘는 OR 조건(>= 23:00 OR < 05:00)은 쿼리보다 함수 쪽이 명확하므로
// 여기서는 기간 필터만 걸고 show_time 필터는 걸지 않는다.
export function useLateNightCandidates() {
  const today = formatLocalDate(new Date())
  const endDate = formatLocalDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))

  return useQuery<LateNightCandidate[]>({
    queryKey: ['late-night-candidates', today],
    queryFn: async () => {
      const { data, error } = await supabase()
        .from('showtimes')
        .select(`
          theater_id,
          show_date,
          show_time,
          theaters(id, name, city),
          movies(id, title, original_title, year, poster_url, genre, director, nation, kmdb_id, tmdb_id, rating)
        `)
        .eq('is_active', true)
        .gte('show_date', today)
        .lte('show_date', endDate)
        .order('show_date', { ascending: true })
        .order('show_time', { ascending: true })
        .limit(5000)

      if (error) throw error

      const candidates: LateNightCandidate[] = []
      for (const r of data ?? []) {
        const m = r.movies as unknown as Record<string, unknown> | null
        const t = r.theaters as unknown as Record<string, unknown> | null
        if (!m || !t) continue
        candidates.push({
          movie: {
            id: String(m.id),
            title: String(m.title),
            originalTitle: m.original_title ? String(m.original_title) : undefined,
            year: Number(m.year),
            posterUrl: m.poster_url ? String(m.poster_url) : undefined,
            genre: (m.genre as string[] | null) ?? [],
            director: (m.director as string[] | null) ?? [],
            nation: m.nation ? String(m.nation) : undefined,
            kmdbId: m.kmdb_id ? String(m.kmdb_id) : undefined,
            tmdbId: m.tmdb_id ? Number(m.tmdb_id) : undefined,
            rating: m.rating ? Number(m.rating) : undefined,
          },
          theaterId: String(t.id),
          theaterName: String(t.name),
          theaterCity: t.city ? String(t.city) : '',
          showDate: r.show_date,
          showTime: r.show_time,
        })
      }
      return candidates
    },
    staleTime: 2 * 60 * 1000,
  })
}

/* ── 매진 임박 후보 회차 (오늘~내일, 좌석 스냅샷 포함) ──────────── */
// 잔여율 판정은 순수 함수(src/lib/curation/getAlmostSoldOutFilms.ts) 책임 —
// 여기서는 좌석 데이터가 수집된(seat_total > 0) 회차만 가져온다.
export function useAlmostSoldOutCandidates() {
  const today = formatLocalDate(new Date())
  const tomorrow = formatLocalDate(new Date(Date.now() + 24 * 60 * 60 * 1000))

  return useQuery<AlmostSoldOutCandidate[]>({
    queryKey: ['almost-sold-out-candidates', today],
    queryFn: async () => {
      const { data, error } = await supabase()
        .from('showtimes')
        .select(`
          theater_id,
          show_date,
          show_time,
          seat_available,
          seat_total,
          theaters(id, name, city),
          movies(id, title, original_title, year, poster_url, genre, director, nation, kmdb_id, tmdb_id, rating)
        `)
        .eq('is_active', true)
        .gte('show_date', today)
        .lte('show_date', tomorrow)
        .gt('seat_total', 0)
        .order('show_date', { ascending: true })
        .order('show_time', { ascending: true })
        .limit(5000)

      if (error) throw error

      const candidates: AlmostSoldOutCandidate[] = []
      for (const r of data ?? []) {
        const m = r.movies as unknown as Record<string, unknown> | null
        const t = r.theaters as unknown as Record<string, unknown> | null
        if (!m || !t) continue
        candidates.push({
          movie: movieRowToMovie(m),
          theaterId: String(t.id),
          theaterName: String(t.name),
          theaterCity: t.city ? String(t.city) : '',
          showDate: r.show_date,
          showTime: r.show_time,
          seatAvailable: Number(r.seat_available ?? 0),
          seatTotal: Number(r.seat_total ?? 0),
        })
      }
      return candidates
    },
    staleTime: 2 * 60 * 1000,
  })
}

export interface MapShowtimeMovie {
  id: string
  title: string
  posterUrl?: string
  genre: string[]
  nation?: string
  director: string[]
}

export interface MapShowtime {
  id: string
  theaterId: string
  movieId: string
  showDate: string
  showTime: string
  seatAvailable: number
  bookingUrl?: string
  movie: MapShowtimeMovie | null
}

/* ── 지도 포스터 집계용 상영 시간표 ─────────────────────────────── */
export function useMapShowtimes(startDate: string, endDate: string) {
  return useQuery<MapShowtime[]>({
    queryKey: ['map-showtimes', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase()
        .from('showtimes')
        .select(`
          id,
          theater_id,
          movie_id,
          show_date,
          show_time,
          seat_available,
          booking_url,
          movies (
            id,
            title,
            poster_url,
            genre,
            nation,
            director
          )
        `)
        .eq('is_active', true)
        .gte('show_date', startDate)
        .lte('show_date', endDate)
        .order('show_date', { ascending: true })
        .order('show_time', { ascending: true })
        .limit(5000)

      if (error) throw error

      return (data ?? []).map((r) => {
        const movie = r.movies as unknown as Record<string, unknown> | null
        return {
          id: r.id,
          theaterId: r.theater_id,
          movieId: String(r.movie_id),
          showDate: r.show_date,
          showTime: r.show_time,
          seatAvailable: Number(r.seat_available ?? 0),
          bookingUrl: r.booking_url ?? undefined,
          movie: movie ? {
            id: String(movie.id),
            title: String(movie.title),
            posterUrl: movie.poster_url ? String(movie.poster_url) : undefined,
            genre: (movie.genre as string[] | null) ?? [],
            nation: movie.nation ? String(movie.nation) : undefined,
            director: (movie.director as string[] | null) ?? [],
          } : null,
        }
      })
    },
    staleTime: 2 * 60 * 1000,
  })
}

/* ── 특정 영화관의 전체 상영 영화 (날짜 무관, 7일 범위) ─────────── */
export interface TheaterMovieEntry {
  movie: Movie
  showtimeCount: number
  earliestDate: string
  availableDates: Set<string>
}

export function useTheaterAllMovies(theaterId: string | null) {
  const today = formatLocalDate(new Date())
  const endDate = formatLocalDate(new Date(Date.now() + 6 * 24 * 60 * 60 * 1000))

  return useQuery<TheaterMovieEntry[]>({
    queryKey: ['theater-all-movies', theaterId, today],
    enabled: !!theaterId,
    queryFn: async () => {
      const { data, error } = await supabase()
        .from('showtimes')
        .select(`
          movie_id,
          show_date,
          movies (
            id, title, original_title, year, poster_url, genre, director,
            nation, kmdb_id, tmdb_id, rating,
            movie_details(synopsis, runtime_minutes, certification)
          )
        `)
        .eq('theater_id', theaterId!)
        .eq('is_active', true)
        .gte('show_date', today)
        .lte('show_date', endDate)
        .order('show_date')
        .limit(1000)

      if (error) throw error

      const entryMap = new Map<string, TheaterMovieEntry>()
      for (const r of data ?? []) {
        const m = r.movies as unknown as Record<string, unknown> | null
        if (!m) continue
        const movieId = String(m.id)

        if (!entryMap.has(movieId)) {
          const details = m.movie_details as Record<string, unknown> | null
          entryMap.set(movieId, {
            movie: {
              id: movieId,
              title: String(m.title),
              originalTitle: m.original_title ? String(m.original_title) : undefined,
              year: Number(m.year),
              posterUrl: m.poster_url ? String(m.poster_url) : undefined,
              genre: (m.genre as string[]) ?? [],
              director: (m.director as string[]) ?? [],
              nation: m.nation ? String(m.nation) : undefined,
              synopsis: details?.synopsis ? String(details.synopsis) : undefined,
              runtimeMinutes: details?.runtime_minutes ? Number(details.runtime_minutes) : undefined,
              certification: details?.certification ? String(details.certification) : undefined,
              kmdbId: m.kmdb_id ? String(m.kmdb_id) : undefined,
              tmdbId: m.tmdb_id ? Number(m.tmdb_id) : undefined,
              rating: m.rating ? Number(m.rating) : undefined,
            },
            showtimeCount: 0,
            earliestDate: r.show_date,
            availableDates: new Set(),
          })
        }

        const entry = entryMap.get(movieId)!
        entry.showtimeCount++
        entry.availableDates.add(r.show_date)
        if (r.show_date < entry.earliestDate) entry.earliestDate = r.show_date
      }

      return Array.from(entryMap.values()).sort((a, b) => b.showtimeCount - a.showtimeCount)
    },
    staleTime: 2 * 60 * 1000,
  })
}

/* ── 특정 영화관의 상영 시간표 ──────────────────────────────────── */
export function useTheaterShowtimes(theaterId: string | null, date: string) {
  return useQuery<{ movies: Movie[]; showtimes: Showtime[] }>({
    queryKey: ['theater-showtimes', theaterId, date],
    enabled: !!theaterId,
    queryFn: async () => {
      const { data, error } = await supabase()
        .from('showtimes')
        .select(`
          id,
          screen_name,
          show_date,
          show_time,
          end_time,
          format_type,
          language,
          seat_available,
          seat_total,
          price,
          booking_url,
          movie_id,
          movies (
            id,
            title,
            original_title,
            year,
            poster_url,
            genre,
            director,
            nation,
            kmdb_id,
            tmdb_id,
            rating,
            movie_details(synopsis, runtime_minutes, certification)
          )
        `)
        .eq('theater_id', theaterId!)
        .eq('show_date', date)
        .eq('is_active', true)
        .order('show_time')

      if (error) throw error

      const rows = data ?? []

      // movie 중복 제거
      const movieMap = new Map<string, Movie>()
      for (const r of rows) {
        const m = r.movies as unknown as Record<string, unknown> | null
        if (!m || movieMap.has(r.movie_id)) continue
        const details = m.movie_details as Record<string, unknown> | null
        movieMap.set(r.movie_id, {
          id: String(m.id),
          title: String(m.title),
          originalTitle: m.original_title ? String(m.original_title) : undefined,
          year: Number(m.year),
          posterUrl: m.poster_url ? String(m.poster_url) : undefined,
          genre: (m.genre as string[]) ?? [],
          director: (m.director as string[]) ?? [],
          nation: m.nation ? String(m.nation) : undefined,
          synopsis: details?.synopsis ? String(details.synopsis) : undefined,
          runtimeMinutes: details?.runtime_minutes ? Number(details.runtime_minutes) : undefined,
          certification: details?.certification ? String(details.certification) : undefined,
          kmdbId: m.kmdb_id ? String(m.kmdb_id) : undefined,
          tmdbId: m.tmdb_id ? Number(m.tmdb_id) : undefined,
          rating: m.rating ? Number(m.rating) : undefined,
        })
      }

      const showtimes: Showtime[] = rows.map((r) => ({
        id: r.id,
        movieId: r.movie_id,
        movieTitle: (r.movies as unknown as Record<string, unknown> | null)?.title as string ?? '',
        theaterId: theaterId!,
        screenName: r.screen_name,
        showDate: r.show_date,
        showTime: r.show_time,
        endTime: r.end_time ?? undefined,
        formatType: r.format_type as Showtime['formatType'],
        language: r.language as Showtime['language'],
        seatAvailable: r.seat_available,
        seatTotal: r.seat_total,
        price: r.price,
        bookingUrl: r.booking_url ?? undefined,
      }))

      return {
        movies: Array.from(movieMap.values()),
        showtimes,
      }
    },
    staleTime: 2 * 60 * 1000,
  })
}

/* ── 영화별 상영 영화관 + 날짜별 상영시간 ───────────────────────── */
export type { MovieTheaterDateGroup, MovieTheaterEntry } from '@/lib/catalog/getMovieTheaterShowtimes'

export function useMovieTheaterShowtimes(movieId: string | null, initialData?: MovieTheaterEntry[]) {
  const today = formatLocalDate(new Date())

  return useQuery<MovieTheaterEntry[]>({
    queryKey: ['movie-theater-showtimes', movieId, today, 'with-theater-coords'],
    enabled: !!movieId,
    initialData: initialData ?? undefined,
    // SSR initialData는 ISR 캐시(최대 1시간 전) 산물 — 즉시 stale 처리해서
    // 화면엔 바로 그리되 마운트 직후 백그라운드 refetch로 신선도 회복
    initialDataUpdatedAt: initialData ? 0 : undefined,
    queryFn: () => getMovieTheaterShowtimesPure(supabase(), movieId!),
    staleTime: 2 * 60 * 1000,
  })
}

/* ── 감독 프로필 ─────────────────────────────────────────────────── */
export interface DirectorProfile {
  name: string
  originalName?: string
  photoUrl?: string
  bio?: string
  source?: string
}

export function useDirectorProfile(name: string | null) {
  return useQuery<DirectorProfile | null>({
    queryKey: ['director-profile', name],
    enabled: !!name,
    queryFn: async () => {
      if (!name) return null
      const { data, error } = await supabase()
        .from('directors')
        .select('name, original_name, photo_url, bio, source')
        .eq('name', name)
        .single()
      if (error || !data) return null
      const row = data as Record<string, unknown>
      return {
        name: String(row.name),
        originalName: row.original_name ? String(row.original_name) : undefined,
        photoUrl: row.photo_url ? String(row.photo_url) : undefined,
        bio: row.bio ? String(row.bio) : undefined,
        source: row.source ? String(row.source) : undefined,
      }
    },
    staleTime: 30 * 60 * 1000,
  })
}

/* ── 주간 랭킹 ──────────────────────────────────────────────────── */
export interface FilmRankingEntry {
  movie_id: string
  rank: number
  prev_rank: number | null
  score: number
  theater_count: number
  showtime_count: number
  view_count: number
}

export interface FilmRankingRow {
  week_start: string
  rankings: FilmRankingEntry[]
}

export function useFilmRankings() {
  return useQuery<FilmRankingRow | null>({
    queryKey: ['film-rankings'],
    queryFn: async () => {
      const { data } = await supabase()
        .from('film_rankings')
        .select('week_start, rankings')
        .order('week_start', { ascending: false })
        .limit(1)
        .single()
      if (!data) return null
      const row = data as Record<string, unknown>
      return {
        week_start: String(row.week_start),
        rankings: (row.rankings as FilmRankingEntry[]) ?? [],
      }
    },
    staleTime: 60 * 60 * 1000,
  })
}
