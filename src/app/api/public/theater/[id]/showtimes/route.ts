import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { SHOWTIME_API_CACHE } from '@/lib/http/cachePolicy'
import { fetchTheaterDayShowtimes } from '@/lib/catalog/theaterShowtimes'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  if (!date) return Response.json({ error: 'date 필요' }, { status: 400 })

  try {
    const result = await fetchTheaterDayShowtimes(createSupabaseAdminClient(), id, date)
    return Response.json(result, { headers: { 'Cache-Control': SHOWTIME_API_CACHE } })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
