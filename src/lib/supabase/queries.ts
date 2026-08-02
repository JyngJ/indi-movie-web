import { useQuery } from '@tanstack/react-query'
import type { AlmostSoldOutCandidate, CurationListRow, LateNightCandidate } from '@/lib/curation/types'
import type { Theater, Movie, Showtime, Station } from '@/types/api'
import type { TheaterEvent } from '@/types/admin'
import type { Festival } from '@/types/festival'
import type { InstagramRecommendation, InstagramRecommendationTargetType } from '@/types/instagramRecommendation'
import { createSupabaseBrowserClient } from './browser'
import { movieRowToMovie } from './movieRow'
import { festivalRowToFestival } from './festivalRow'
import { formatLocalDate, toKstIsoDate } from '@/lib/date'
import { getRegionFromCity } from '@/lib/regions'
import type { MovieTheaterEntry } from '@/lib/catalog/getMovieTheaterShowtimes'

function supabase() {
  return createSupabaseBrowserClient()
}

/** /api/public/showtimes-window 응답 행 — 서버에서 이미 movies/theaters 조인·정규화 완료 */
interface ShowtimesWindowRow {
  id: string
  theaterId: string
  movieId: string
  showDate: string
  showTime: string
  seatAvailable?: number
  seatTotal?: number
  bookingUrl?: string
  theater: { id: string; name: string; city: string; lat?: number; lng?: number } | null
  movie: Movie | null
}

/** 기간 내 상영 시간표(영화·극장 조인 포함) — CDN 캐시 타는 공용 서버 라우트 경유 */
async function fetchShowtimesWindow(params: {
  from: string
  to: string
  theaterId?: string
  minSeatTotal?: number
}): Promise<ShowtimesWindowRow[]> {
  const qs = new URLSearchParams({ from: params.from, to: params.to })
  if (params.theaterId) qs.set('theaterId', params.theaterId)
  if (params.minSeatTotal != null) qs.set('minSeatTotal', String(params.minSeatTotal))

  const res = await fetch(`/api/public/showtimes-window?${qs.toString()}`)
  if (!res.ok) throw new Error(`showtimes-window fetch 실패: ${res.status}`)
  return res.json()
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
// /api/public/movies 서버 라우트 경유 — CDN 캐시로 Supabase egress 절감
export function useMovies() {
  return useQuery<Movie[]>({
    queryKey: ['movies'],
    queryFn: async () => {
      const res = await fetch('/api/public/movies')
      if (!res.ok) throw new Error(`movies fetch 실패: ${res.status}`)
      return res.json()
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
      const res = await fetch(`/api/public/movie/${movieId}`)
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`movie-detail fetch 실패: ${res.status}`)
      return res.json()
    },
    staleTime: 10 * 60 * 1000,
  })
}

/* ── 오늘 포함 미래 상영 스케줄이 있는 영화 ID 목록 ─────────────── */
async function fetchActiveShowtimePairs(theaterIds: string[] | null): Promise<{ movieId: string; theaterId: string }[]> {
  if (theaterIds !== null && theaterIds.length === 0) return []
  const qs = theaterIds !== null ? `?theaterIds=${theaterIds.join(',')}` : ''
  const res = await fetch(`/api/public/active-showtimes${qs}`)
  if (!res.ok) throw new Error(`active-showtimes fetch 실패: ${res.status}`)
  return res.json()
}

export function useActiveMovieIds() {
  const today = formatLocalDate(new Date())

  return useQuery<string[]>({
    queryKey: ['active-movie-ids', today],
    queryFn: async () => {
      const pairs = await fetchActiveShowtimePairs(null)
      return Array.from(new Set(pairs.map((p) => p.movieId)))
    },
    staleTime: 5 * 60 * 1000,
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
      const pairs = await fetchActiveShowtimePairs(theaterIds)
      return Array.from(new Set(pairs.map((p) => p.movieId)))
    },
    staleTime: 5 * 60 * 1000,
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
    queryFn: () => fetchActiveShowtimePairs(theaterIds),
    staleTime: 5 * 60 * 1000,
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

/* ── 진행중/예정 영화제 (상영작 탭 "주목할 영화제" 배너) ─────────── */
// 지역 필터를 안 탐 — festivals는 전국 대상. end_date >= today로 종료된 건 제외,
// start_date 임박순 정렬(진행중이 upcoming보다 먼저 오도록 start_date가 이미 과거인
// 진행중 항목이 자연히 앞선다).
export function useFestivals() {
  // 한국 서비스 대상 고정 개념(회기)이라 기기 로컬 타임존이 아닌 KST로 고정 — formatLocalDate였다면
  // 해외 사용자 기기 시간대에 따라 "오늘"이 어긋날 수 있음.
  const today = toKstIsoDate(new Date())
  return useQuery<Festival[]>({
    queryKey: ['festivals', today],
    queryFn: async () => {
      const { data, error } = await supabase()
        .from('festivals')
        .select('id, name, slug, start_date, end_date, region, city, venue_text, banner_url, link_url, description, is_active')
        .eq('is_active', true)
        .gte('end_date', today)
        .order('start_date', { ascending: true })

      if (error) throw error

      return (data ?? []).map((r) => festivalRowToFestival(r as Record<string, unknown>))
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}

/* ── 인스타그램 추천 카드 (상영작 탭 "인스타그램에서 추천한 그 영화") ────── */
// 상태/우측 이미지는 저장 안 하고 movies/festivals 조인 결과로 런타임 계산(정렬은
// src/lib/curation/sortInstagramRecommendations.ts에 위임 — 순수함수라 테스트 가능).
// movie 타입은 instagram_recommendation_movies로 1편 이상 연결(카드뉴스 한 장이 여러 편을
// 소개하는 경우가 있어서 movie_id를 이 테이블에 직접 안 둠).
export function useInstagramRecommendations() {
  const today = toKstIsoDate(new Date())

  return useQuery<InstagramRecommendation[]>({
    queryKey: ['instagram-recommendations', today],
    queryFn: async () => {
      const { data, error } = await supabase()
        .from('instagram_recommendations')
        .select(`
          id, target_type, festival_id, title_snapshot, card_image_url,
          instagram_url, published_at, display_until, is_active, sort_order,
          instagram_recommendation_movies(
            id, movie_id, title_snapshot, sort_order,
            movies(id,title,original_title,year,poster_url,genre,director,nation,kmdb_id,tmdb_id,rating)
          ),
          festivals(id,name,slug,start_date,end_date,region,city,venue_text,banner_url,link_url,description,is_active)
        `)
        .eq('is_active', true)
        // display_until이 지난 건 쿼리 단계에서부터 제외 — 클라이언트(sortInstagramRecommendations의
        // isInstagramRecVisible)에서도 한 번 더 걸러 이중 방어
        .or(`display_until.is.null,display_until.gte.${today}`)
        .order('sort_order', { ascending: true })

      if (error) throw error

      return (data ?? []).map((raw) => {
        const row = raw as unknown as {
          id: string; target_type: InstagramRecommendationTargetType
          festival_id: string | null
          title_snapshot: string; card_image_url: string
          instagram_url: string | null; published_at: string | null
          display_until: string | null
          is_active: boolean; sort_order: number
          instagram_recommendation_movies: {
            id: string; movie_id: string | null; title_snapshot: string; sort_order: number
            movies: Record<string, unknown> | null
          }[]
          festivals: Record<string, unknown> | null
        }
        return {
          id: row.id,
          targetType: row.target_type,
          movies: [...row.instagram_recommendation_movies]
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((m) => ({
              id: m.id,
              movieId: m.movie_id,
              movie: m.movies ? movieRowToMovie(m.movies) : null,
              titleSnapshot: m.title_snapshot,
              sortOrder: m.sort_order,
            })),
          festivalId: row.festival_id,
          festival: row.festivals ? festivalRowToFestival(row.festivals) : null,
          titleSnapshot: row.title_snapshot,
          cardImageUrl: row.card_image_url,
          instagramUrl: row.instagram_url,
          publishedAt: row.published_at,
          displayUntil: row.display_until,
          isActive: row.is_active,
          sortOrder: row.sort_order,
        } satisfies InstagramRecommendation
      })
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
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
      const rows = await fetchShowtimesWindow({ from: today, to: endDate })

      const candidates: LateNightCandidate[] = []
      for (const r of rows) {
        if (!r.movie || !r.theater) continue
        candidates.push({
          movie: r.movie,
          theaterId: r.theater.id,
          theaterName: r.theater.name,
          theaterCity: r.theater.city,
          showDate: r.showDate,
          showTime: r.showTime,
        })
      }
      return candidates
    },
    staleTime: 5 * 60 * 1000,
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
      const rows = await fetchShowtimesWindow({ from: today, to: tomorrow, minSeatTotal: 0 })

      const candidates: AlmostSoldOutCandidate[] = []
      for (const r of rows) {
        if (!r.movie || !r.theater) continue
        candidates.push({
          movie: r.movie,
          theaterId: r.theater.id,
          theaterName: r.theater.name,
          theaterCity: r.theater.city,
          showDate: r.showDate,
          showTime: r.showTime,
          seatAvailable: r.seatAvailable ?? 0,
          seatTotal: r.seatTotal ?? 0,
        })
      }
      return candidates
    },
    staleTime: 5 * 60 * 1000,
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
      const rows = await fetchShowtimesWindow({ from: startDate, to: endDate })

      return rows.map((r) => ({
        id: r.id,
        theaterId: r.theaterId,
        movieId: r.movieId,
        showDate: r.showDate,
        showTime: r.showTime,
        seatAvailable: r.seatAvailable ?? 0,
        bookingUrl: r.bookingUrl,
        movie: r.movie ? {
          id: r.movie.id,
          title: r.movie.title,
          posterUrl: r.movie.posterUrl,
          genre: r.movie.genre,
          nation: r.movie.nation,
          director: r.movie.director,
        } : null,
      }))
    },
    staleTime: 5 * 60 * 1000,
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
      const res = await fetch(`/api/public/theater/${theaterId}/movies?from=${today}&to=${endDate}`)
      if (!res.ok) throw new Error(`theater-movies fetch 실패: ${res.status}`)
      const rows: Array<Omit<TheaterMovieEntry, 'availableDates'> & { availableDates: string[] }> = await res.json()
      return rows.map((r) => ({ ...r, availableDates: new Set(r.availableDates) }))
    },
    staleTime: 5 * 60 * 1000,
  })
}

/* ── 특정 영화관의 상영 시간표 ──────────────────────────────────── */
export function useTheaterShowtimes(theaterId: string | null, date: string) {
  return useQuery<{ movies: Movie[]; showtimes: Showtime[] }>({
    queryKey: ['theater-showtimes', theaterId, date],
    enabled: !!theaterId,
    queryFn: async () => {
      const res = await fetch(`/api/public/theater/${theaterId}/showtimes?date=${date}`)
      if (!res.ok) throw new Error(`theater-showtimes fetch 실패: ${res.status}`)
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
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
    queryFn: async () => {
      const res = await fetch(`/api/public/movie/${movieId}/theaters`)
      if (!res.ok) throw new Error(`movie-theater-showtimes fetch 실패: ${res.status}`)
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
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
      const res = await fetch(`/api/public/director?name=${encodeURIComponent(name)}`)
      if (!res.ok) return null
      return res.json()
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
      const res = await fetch('/api/public/film-rankings')
      if (!res.ok) return null
      return res.json()
    },
    staleTime: 60 * 60 * 1000,
  })
}
