import { listTheaterEvents } from '@/lib/admin/event-store'
import { SHOWTIME_API_CACHE } from '@/lib/http/cachePolicy'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const events = await listTheaterEvents({ fromDate: new Date().toISOString().slice(0, 10) })
    return Response.json(events, {
      headers: {
        'Cache-Control': SHOWTIME_API_CACHE,
      },
    })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : '이벤트 조회 실패' }, { status: 500 })
  }
}
