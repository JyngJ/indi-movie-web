import { unstable_cache } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { MovieDetail } from '@/types/api'

/**
 * 영화 상세 조회 — 단일 진입점.
 *
 * 이전에는 이 select 블록이 페이지 3곳·API 라우트 1곳에 복붙돼 있었고, 각 호출부가
 * 알아서 캐싱을 붙이는 구조라 한 곳을 고쳐도 나머지가 계속 Supabase를 쳤다.
 * (2026-08 movies 테이블 요청 폭주.) 조회·매핑·캐싱을 여기 한 곳에 모아
 * 호출부는 `getMovieDetail(id)`만 부르게 한다.
 */
const MOVIE_DETAIL_SELECT = `
  id, title, original_title, year, poster_url, genre, director,
  nation, kmdb_id, tmdb_id, rating,
  movie_details (synopsis, runtime_minutes, certification, cast_members)
`

/**
 * 캐시 TTL(초) — 영화 메타데이터는 거의 안 바뀌므로 길게. ISR 페이지(`/movie/[id]`,
 * revalidate 3600)와 맞춘다: Next는 페이지 재검증 주기를 그 안에서 쓰인 캐시들의
 * 최솟값으로 낮추므로, 이보다 짧게 잡으면 페이지 재생성이 오히려 잦아진다.
 */
const MOVIE_DETAIL_TTL = 3600

function mapRow(data: unknown): MovieDetail {
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
}

/**
 * 영화 상세를 조회한다. 없으면 null.
 *
 * `unstable_cache`로 감싸 두 가지를 동시에 막는다.
 * 1. 같은 요청 안에서 generateMetadata·페이지 컴포넌트가 각각 부르는 중복 호출
 * 2. force-dynamic 페이지의 방문마다 재조회 (페이지는 캐싱 못 해도 데이터는 캐싱된다)
 *
 * 인자 `id`는 캐시 키에 자동으로 포함된다.
 */
export const getMovieDetail = unstable_cache(
  async (id: string): Promise<MovieDetail | null> => {
    const supabase = createSupabaseServerClient()
    const { data } = await supabase
      .from('movies')
      .select(MOVIE_DETAIL_SELECT)
      .eq('id', id)
      .single()

    return data ? mapRow(data) : null
  },
  ['catalog', 'movie-detail'],
  { revalidate: MOVIE_DETAIL_TTL, tags: ['movie-detail'] },
)
