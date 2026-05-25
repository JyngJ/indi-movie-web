import { adminAuthErrorResponse, requireAdminSessionUser } from '@/lib/admin/auth'
import { searchKmdbMovies } from '@/lib/admin/kmdb'
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
    const [kmdbMovies, localMovies] = await Promise.all([
      searchKmdbMovies(query).catch(() => []),
      searchLocalMovies(query),
    ])

    // 로컬 DB에 이미 있는 movie는 KMDB 결과 뒤에 dedupe 없이 그냥 추가
    const localKmdbIds = new Set(kmdbMovies.map((m) => m.movieId).filter(Boolean))
    const dedupedLocal = localMovies.filter((m) => !m.movieId || !localKmdbIds.has(m.movieId))

    const movies = [...kmdbMovies, ...dedupedLocal]
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
