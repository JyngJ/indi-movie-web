import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getMovieTheaterShowtimes } from '@/lib/catalog/getMovieTheaterShowtimes'
import { SHOWTIME_API_CACHE } from '@/lib/http/cachePolicy'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from') ?? undefined
  const until = searchParams.get('until') ?? undefined

  const supabase = createSupabaseAdminClient()
  try {
    const entries = await getMovieTheaterShowtimes(supabase, id, { from, until })
    return Response.json(entries, {
      headers: {
        'Cache-Control': SHOWTIME_API_CACHE,
      },
    })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : '조회 실패' }, { status: 500 })
  }
}
