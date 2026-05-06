import type { AdminMovieInput } from '@/types/admin'
import { adminAuthErrorResponse, requireAdminSessionUser } from '@/lib/admin/auth'
import { listAdminMovies, updateAdminMovie } from '@/lib/admin/store'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    await requireAdminSessionUser(request)
    return Response.json({ movies: await listAdminMovies() })
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      return adminAuthErrorResponse(error)
    }

    return Response.json(
      {
        error: {
          code: 'ADMIN_MOVIE_LIST_ERROR',
          message: error instanceof Error ? error.message : '영화 목록을 불러오지 못했습니다.',
        },
      },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdminSessionUser(request)
    const payload = (await request.json()) as Partial<AdminMovieInput>
    const movie = await updateAdminMovie({
      id: payload.id,
      title: payload.title ?? '',
      year: Number(payload.year),
      originalTitle: payload.originalTitle,
      genre: payload.genre,
      director: payload.director,
      kobisMovieCd: payload.kobisMovieCd,
    })

    return Response.json({ movie })
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      return adminAuthErrorResponse(error)
    }

    return Response.json(
      {
        error: {
          code: 'ADMIN_MOVIE_UPDATE_ERROR',
          message: error instanceof Error ? error.message : '영화를 수정하지 못했습니다.',
        },
      },
      { status: 400 },
    )
  }
}
