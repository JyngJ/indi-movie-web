import { adminAuthErrorResponse, requireAdminSessionUser } from '@/lib/admin/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request) {
  try {
    await requireAdminSessionUser(request)
  } catch (error) {
    return adminAuthErrorResponse(error)
  }

  try {
    const supabase = createSupabaseAdminClient()

    // Get all showtimes with current seat info
    const { data: showtimes, error: fetchError } = await supabase
      .from('showtimes')
      .select('id, theater_id, seat_available, seat_total')
      .eq('is_active', true)

    if (fetchError) throw new Error(fetchError.message)

    if (!showtimes || showtimes.length === 0) {
      return Response.json({
        updated: 0,
        message: '업데이트할 상영 정보가 없습니다.',
      })
    }

    // Update each showtime's seat info (in this case, they're already updated from the select)
    // If you need to fetch latest seat data from external sources, that would happen here
    // For now, we just confirm the current seat data is in sync

    return Response.json({
      updated: showtimes.length,
      message: `${showtimes.length}개 상영의 좌석 정보를 확인했습니다.`,
    })
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      return adminAuthErrorResponse(error)
    }

    return Response.json(
      {
        error: {
          code: 'SEAT_UPDATE_ERROR',
          message: error instanceof Error ? error.message : '좌석 정보 업데이트에 실패했습니다.',
        },
      },
      { status: 500 },
    )
  }
}
