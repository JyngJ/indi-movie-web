import { adminAuthErrorResponse, requireAdminSessionUser } from '@/lib/admin/auth'
import { searchKmdbMovies } from '@/lib/admin/kmdb'

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
    const movies = await searchKmdbMovies(query)
    return Response.json({ movies })
  } catch (error) {
    return Response.json(
      {
        error: {
          code: 'KMDB_MOVIE_SEARCH_ERROR',
          message: error instanceof Error ? error.message : 'KMDB 영화 검색에 실패했습니다.',
        },
      },
      { status: 500 },
    )
  }
}
