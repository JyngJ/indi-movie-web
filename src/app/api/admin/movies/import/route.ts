import { adminAuthErrorResponse, requireAdminSessionUser } from '@/lib/admin/auth'
import { getKobisMovie } from '@/lib/admin/kobis'
import { importAdminExternalMovie } from '@/lib/admin/store'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    await requireAdminSessionUser(request)
  } catch (error) {
    return adminAuthErrorResponse(error)
  }

  const payload = (await request.json()) as Partial<{ kobisMovieCd: string }>
  const kobisMovieCd = payload.kobisMovieCd?.trim()

  if (!kobisMovieCd) {
    return Response.json(
      { error: { code: 'INVALID_KOBIS_IMPORT_PAYLOAD', message: 'KOBIS 영화 코드가 필요합니다.' } },
      { status: 400 },
    )
  }

  try {
    const externalMovie = await getKobisMovie(kobisMovieCd)
    const movie = await importAdminExternalMovie(externalMovie)

    return Response.json({ movie })
  } catch (error) {
    return Response.json(
      {
        error: {
          code: 'KOBIS_MOVIE_IMPORT_ERROR',
          message: error instanceof Error ? error.message : 'KOBIS 영화를 가져오지 못했습니다.',
        },
      },
      { status: 500 },
    )
  }
}
