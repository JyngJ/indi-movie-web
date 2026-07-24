import { createSupabaseServerClient } from '@/lib/supabase/server'
import { toKstIsoDate } from '@/lib/date'
import { getRegionFromCity } from '@/lib/regions'

/**
 * 검색엔진 인덱싱용 "현재 상영 중" 데이터 (SSR 전용).
 *
 * 클라이언트 훅(useMovies/useActiveMovieIds…)은 브라우저에서 데이터를 채우므로
 * 서버 HTML엔 상영작/극장 텍스트가 남지 않는다 — head term("독립영화 시간표")으로
 * 랭킹할 본문이 비어있는 게 핵심 병목이었다. 이 함수는 동일한 조회를 서버에서 수행해
 * 크롤러가 읽을 실제 링크/텍스트를 만들 재료를 제공한다.
 *
 * Clean Architecture: 순수 조회(인프라 접근)만 담당하고 UI를 모른다.
 */

export interface ScreeningMovie {
  id: string
  title: string
  year: number | null
  director: string[]
  nation: string | null
}

export interface ScreeningTheater {
  id: string
  name: string
  city: string
  address: string
  region: string
}

export interface ScreeningIndex {
  /** KST 기준 조회일 (YYYY-MM-DD) */
  date: string
  movies: ScreeningMovie[]
  theaters: ScreeningTheater[]
}

/**
 * @param regionId REGIONS의 지역 id(예: '서울', '부산'). 지정 시 해당 지역 극장/상영작만.
 *                 미지정이면 전국.
 */
export async function getScreeningIndex(regionId?: string): Promise<ScreeningIndex> {
  const supabase = createSupabaseServerClient()
  const today = toKstIsoDate(new Date())

  const { data: theaterRows } = await supabase
    .from('theaters')
    .select('id,name,city,address')
    .order('name')

  let theaters: ScreeningTheater[] = (theaterRows ?? []).map((t) => ({
    id: String(t.id),
    name: String(t.name),
    city: String(t.city ?? ''),
    address: String(t.address ?? ''),
    region: getRegionFromCity(String(t.city ?? '')),
  }))

  if (regionId) theaters = theaters.filter((t) => t.region === regionId)
  const theaterIds = theaters.map((t) => t.id)

  // 지역 페이지인데 극장이 0개면 상영작 조회 자체가 무의미 — 조기 반환
  if (regionId && theaterIds.length === 0) {
    return { date: today, movies: [], theaters: [] }
  }

  let showtimeQuery = supabase
    .from('showtimes')
    .select('movie_id')
    .eq('is_active', true)
    .gte('show_date', today)

  if (regionId) showtimeQuery = showtimeQuery.in('theater_id', theaterIds)

  const { data: showtimeRows } = await showtimeQuery
  const movieIds = Array.from(
    new Set((showtimeRows ?? []).map((r) => r.movie_id).filter(Boolean)),
  )

  if (movieIds.length === 0) {
    return { date: today, movies: [], theaters }
  }

  const { data: movieRows } = await supabase
    .from('movies')
    .select('id,title,year,director,nation')
    .in('id', movieIds)
    .order('title')

  const movies: ScreeningMovie[] = (movieRows ?? []).map((m) => ({
    id: String(m.id),
    title: String(m.title),
    year: m.year != null ? Number(m.year) : null,
    director: (m.director as string[] | null) ?? [],
    nation: m.nation != null ? String(m.nation) : null,
  }))

  return { date: today, movies, theaters }
}
