import type { ShowtimeSeatUpdateInput } from '@/types/admin'
import { adminAuthErrorResponse, requireAdminSessionUser } from '@/lib/admin/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSessionUser(request)
    const { id: theaterId } = await context.params
    const updates = (await request.json()) as ShowtimeSeatUpdateInput[]

    if (!Array.isArray(updates) || updates.length === 0) {
      return Response.json(
        {
          error: {
            code: 'INVALID_SEAT_UPDATE',
            message: '업데이트할 상영 정보가 필요합니다.',
          },
        },
        { status: 400 },
      )
    }

    const supabase = createSupabaseAdminClient()

    const results = await Promise.all(
      updates.map(async (update) => {
        const { error } = await supabase
          .from('showtimes')
          .update({
            seat_available: update.seatAvailable,
            seat_total: update.seatTotal,
          })
          .eq('id', update.id)
          .eq('theater_id', theaterId)

        return { id: update.id, error }
      }),
    )

    const failed = results.filter((r) => r.error)
    if (failed.length > 0) {
      return Response.json(
        {
          error: {
            code: 'SEAT_UPDATE_FAILED',
            message: `${failed.length}개 항목 업데이트 실패`,
            details: failed,
          },
        },
        { status: 500 },
      )
    }

    return Response.json({
      updated: updates.length,
      message: `${updates.length}개 상영의 좌석 정보를 업데이트했습니다.`,
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
