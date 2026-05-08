import { adminAuthErrorResponse, requireAdminSessionUser } from '@/lib/admin/auth'
import { getKmdbMovie } from '@/lib/admin/kmdb'
import { importAdminExternalMovie } from '@/lib/admin/store'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    await requireAdminSessionUser(request)
  } catch (error) {
    return adminAuthErrorResponse(error)
  }

  const payload = (await request.json()) as Partial<{ kmdbMovieId: string; kmdbMovieSeq: string }>
  const kmdbMovieId = payload.kmdbMovieId?.trim()
  const kmdbMovieSeq = payload.kmdbMovieSeq?.trim()

  if (!kmdbMovieId || !kmdbMovieSeq) {
    return Response.json(
      { error: { code: 'INVALID_KMDB_IMPORT_PAYLOAD', message: 'KMDB movieId와 movieSeq가 필요합니다.' } },
      { status: 400 },
    )
  }

  try {
    const externalMovie = await getKmdbMovie(kmdbMovieId, kmdbMovieSeq)
    const movie = await importAdminExternalMovie(externalMovie)

    return Response.json({ movie })
  } catch (error) {
    return Response.json(
      {
        error: {
          code: 'KMDB_MOVIE_IMPORT_ERROR',
          message: error instanceof Error ? error.message : 'KMDB 영화를 가져오지 못했습니다.',
        },
      },
      { status: 500 },
    )
  }
}
