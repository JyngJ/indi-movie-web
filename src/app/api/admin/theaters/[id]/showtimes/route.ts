import type { AdminShowtimeInput } from '@/types/admin'
import { adminAuthErrorResponse, requireAdminSessionUser } from '@/lib/admin/auth'
import { listAdminServiceShowtimes, updateAdminServiceShowtime } from '@/lib/admin/store'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSessionUser(request)
    const { id } = await context.params
    return Response.json({ showtimes: await listAdminServiceShowtimes(id) })
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      return adminAuthErrorResponse(error)
    }

    return Response.json(
      {
        error: {
          code: 'ADMIN_SHOWTIME_LIST_ERROR',
          message: error instanceof Error ? error.message : '극장별 시간표를 불러오지 못했습니다.',
        },
      },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSessionUser(request)
    const { id } = await context.params
    const payload = (await request.json()) as Partial<AdminShowtimeInput>
    const showtime = await updateAdminServiceShowtime({
      id: payload.id ?? '',
      theaterId: payload.theaterId ?? id,
      movieId: payload.movieId ?? '',
      screenName: payload.screenName ?? '',
      showDate: payload.showDate ?? '',
      showTime: payload.showTime ?? '',
      endTime: payload.endTime,
      formatType: payload.formatType ?? 'standard',
      language: payload.language ?? 'korean',
      seatAvailable: Number(payload.seatAvailable ?? 0),
      seatTotal: Number(payload.seatTotal ?? 0),
      price: Number(payload.price ?? 0),
      bookingUrl: payload.bookingUrl,
      isActive: payload.isActive ?? true,
    })

    return Response.json({ showtime })
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      return adminAuthErrorResponse(error)
    }

    return Response.json(
      {
        error: {
          code: 'ADMIN_SHOWTIME_UPDATE_ERROR',
          message: error instanceof Error ? error.message : '상영시간표를 수정하지 못했습니다.',
        },
      },
      { status: 400 },
    )
  }
}
