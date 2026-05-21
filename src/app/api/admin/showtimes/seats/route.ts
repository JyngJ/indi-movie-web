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

    // Get total count
    const { count } = await supabase
      .from('showtimes')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    if (!count) {
      return Response.json({
        updated: 0,
        message: '업데이트할 상영 정보가 없습니다.',
      })
    }

    // Fetch all showtimes in batches (Supabase has 1000 row limit per query)
    const pageSize = 1000
    const pages = Math.ceil(count / pageSize)
    const allShowtimes: Array<{ id: string; theater_id: string; seat_available: number; seat_total: number }> = []

    for (let i = 0; i < pages; i++) {
      const from = i * pageSize
      const to = from + pageSize - 1

      const { data: showtimes, error: fetchError } = await supabase
        .from('showtimes')
        .select('id, theater_id, seat_available, seat_total')
        .eq('is_active', true)
        .range(from, to)

      if (fetchError) throw new Error(fetchError.message)
      if (showtimes) allShowtimes.push(...showtimes)
    }

    return Response.json({
      updated: allShowtimes.length,
      message: `전체 ${allShowtimes.length}개 상영의 좌석 정보를 확인했습니다.`,
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
