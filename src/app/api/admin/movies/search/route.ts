import { adminAuthErrorResponse, requireAdminSessionUser } from '@/lib/admin/auth'
import { searchKmdbMovies } from '@/lib/admin/kmdb'
import { searchCine21Movies } from '@/lib/admin/cine21'
import { searchLocalMovies } from '@/lib/admin/store'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    await requireAdminSessionUser(request)
  } catch (error) {
    return adminAuthErrorResponse(error)
  }

  const url = new URL(request.url)
  const query = url.searchParams.get('q') ?? ''

  try {
    const [kmdbMovies, cine21Movies, localMovies] = await Promise.all([
      searchKmdbMovies(query).catch(() => []),
      searchCine21Movies(query).catch(() => []),
      searchLocalMovies(query),
    ])

    // 씨네21 결과 중 KMDB에 없는 것만 추가
    const kmdbTitles = new Set(kmdbMovies.map(m => m.title.trim()))
    const dedupedCine21 = cine21Movies.filter(m => !kmdbTitles.has(m.title.trim()))

    // 로컬 DB에 이미 있는 movie는 외부 결과 뒤에 추가
    const externalIds = new Set([...kmdbMovies, ...dedupedCine21].map(m => m.movieId).filter(Boolean))
    const dedupedLocal = localMovies.filter((m) => !m.movieId || !externalIds.has(m.movieId))

    const movies = [...kmdbMovies, ...dedupedCine21, ...dedupedLocal]
    return Response.json({ movies })
  } catch (error) {
    return Response.json(
      {
        error: {
          code: 'MOVIE_SEARCH_ERROR',
          message: error instanceof Error ? error.message : '영화 검색에 실패했습니다.',
        },
      },
      { status: 500 },
    )
  }
}
