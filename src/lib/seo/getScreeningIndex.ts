import { unstable_cache } from 'next/cache'
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
 * 조회는 전국분 한 번만 하고 지역별은 그 결과를 메모리에서 걸러낸다.
 * 예전엔 호출처(홈 · /map · llms.txt · 지역 17개)마다 각자 3개씩 쿼리를 날려
 * 배포 직후 캐시가 빈 순간 60여 개가 동시에 터졌고, supabase-js 내부 fetch가
 * 실패하면서 `TypeError: fetch failed` → 500이 났다. Googlebot이 그 창에 걸리면
 * 그대로 "서버 오류(5xx)"로 색인에서 제외된다(2026-08-12 확인).
 *
 * Clean Architecture: 순수 조회(인프라 접근)만 담당하고 UI를 모른다.
 */

export interface ScreeningMovie {
  id: string
  title: string
  year: number | null
  director: string[]
  nation: string | null
  posterUrl: string | null
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

/** 크롤러가 읽을 텍스트라 몇 시간 지연은 무해하다 — 페이지들의 revalidate와 같은 6시간 */
const TTL = 21600

/**
 * 일시적 네트워크 실패(`TypeError: fetch failed`)를 한 번 흡수한다.
 * 콜드 스타트에 요청이 몰리면 첫 연결이 실패하는 일이 있는데, 그 한 번 때문에
 * 페이지 전체가 500이 되는 게 지금까지의 사고 패턴이었다.
 */
async function withRetry<T>(label: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (e) {
    console.warn(`[screening-index] ${label} 1차 실패, 재시도: ${e instanceof Error ? e.message : String(e)}`)
    await new Promise((r) => setTimeout(r, 300))
    return run()
  }
}

interface NationalIndex {
  date: string
  theaters: ScreeningTheater[]
  movies: ScreeningMovie[]
  /** movieId → 상영 중인 theaterId 목록 (지역 필터를 메모리에서 하기 위한 매핑) */
  theaterIdsByMovie: Record<string, string[]>
}

/**
 * 날짜를 인자로 받아 캐시 키에 날짜가 들어가게 한다 — 안 그러면 자정을 넘겨도
 * TTL이 남아 있는 동안 전날 상영작이 그대로 나온다. (getTheaterDetail과 같은 이유)
 */
const getNationalIndex = unstable_cache(
  async (today: string): Promise<NationalIndex> => {
    const supabase = createSupabaseServerClient()

    const theaterRows = await withRetry('theaters', async () => {
      const { data, error } = await supabase
        .from('theaters')
        .select('id,name,city,address')
        .order('name')
      if (error) throw new Error(`theaters 조회 실패: ${error.message}`)
      return data ?? []
    })

    const theaters: ScreeningTheater[] = theaterRows.map((t) => ({
      id: String(t.id),
      name: String(t.name),
      city: String(t.city ?? ''),
      address: String(t.address ?? ''),
      region: getRegionFromCity(String(t.city ?? '')),
    }))

    const showtimeRows = await withRetry('showtimes', async () => {
      const { data, error } = await supabase
        .from('showtimes')
        .select('movie_id,theater_id')
        .eq('is_active', true)
        .gte('show_date', today)
      if (error) throw new Error(`showtimes 조회 실패: ${error.message}`)
      return data ?? []
    })

    const theaterIdsByMovie: Record<string, string[]> = {}
    for (const row of showtimeRows) {
      if (!row.movie_id || !row.theater_id) continue
      const movieId = String(row.movie_id)
      const theaterId = String(row.theater_id)
      const list = (theaterIdsByMovie[movieId] ??= [])
      if (!list.includes(theaterId)) list.push(theaterId)
    }

    const movieIds = Object.keys(theaterIdsByMovie)
    if (movieIds.length === 0) {
      return { date: today, theaters, movies: [], theaterIdsByMovie }
    }

    const movieRows = await withRetry('movies', async () => {
      const { data, error } = await supabase
        .from('movies')
        .select('id,title,year,director,nation,poster_url')
        .in('id', movieIds)
        .order('title')
      if (error) throw new Error(`movies 조회 실패: ${error.message}`)
      return data ?? []
    })

    const movies: ScreeningMovie[] = movieRows.map((m) => ({
      id: String(m.id),
      title: String(m.title),
      year: m.year != null ? Number(m.year) : null,
      director: (m.director as string[] | null) ?? [],
      nation: m.nation != null ? String(m.nation) : null,
      posterUrl: m.poster_url != null ? String(m.poster_url) : null,
    }))

    return { date: today, theaters, movies, theaterIdsByMovie }
  },
  ['seo', 'screening-index'],
  { revalidate: TTL, tags: ['screening-index'] },
)

/**
 * @param regionId REGIONS의 지역 id(예: '서울', '부산'). 지정 시 해당 지역 극장/상영작만.
 *                 미지정이면 전국.
 */
export async function getScreeningIndex(regionId?: string): Promise<ScreeningIndex> {
  const national = await getNationalIndex(toKstIsoDate(new Date()))

  if (!regionId) {
    return { date: national.date, movies: national.movies, theaters: national.theaters }
  }

  const theaters = national.theaters.filter((t) => t.region === regionId)
  // 지역 페이지인데 극장이 0개면 상영작도 있을 수 없다 — 조기 반환
  if (theaters.length === 0) return { date: national.date, movies: [], theaters: [] }

  const theaterIds = new Set(theaters.map((t) => t.id))
  const movies = national.movies.filter((m) =>
    (national.theaterIdsByMovie[m.id] ?? []).some((id) => theaterIds.has(id)),
  )

  return { date: national.date, movies, theaters }
}
