import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { movieRowToMovie } from '@/lib/supabase/movieRow'

export const dynamic = 'force-dynamic'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * 기간 내 활성 상영 시간표 + 영화/극장 조인 결과.
 * 여러 클라이언트 훅(심야/매진임박/지도/큐레이션 오늘회차)이 공유하는 단일 서버 라우트 —
 * 브라우저가 Supabase REST를 직접 조인 호출하던 걸 여기로 모아 CDN 캐시로 egress를 줄인다.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const theaterId = searchParams.get('theaterId')
  const minSeatTotal = searchParams.get('minSeatTotal')

  if (!from || !to || !DATE_RE.test(from) || !DATE_RE.test(to)) {
    return Response.json({ error: 'from/to는 YYYY-MM-DD 형식이어야 합니다.' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()
  let query = supabase
    .from('showtimes')
    .select(`
      id,
      theater_id,
      movie_id,
      show_date,
      show_time,
      seat_available,
      seat_total,
      booking_url,
      theaters(id, name, city, lat, lng),
      movies(id, title, original_title, year, poster_url, genre, director, nation, kmdb_id, tmdb_id, rating)
    `)
    .eq('is_active', true)
    .gte('show_date', from)
    .lte('show_date', to)
    .order('show_date', { ascending: true })
    .order('show_time', { ascending: true })
    .limit(5000)

  if (theaterId) query = query.eq('theater_id', theaterId)
  if (minSeatTotal) query = query.gt('seat_total', Number(minSeatTotal))

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []).map((r) => {
    const m = r.movies as unknown as Record<string, unknown> | null
    const t = r.theaters as unknown as Record<string, unknown> | null
    return {
      id: r.id,
      theaterId: r.theater_id,
      movieId: r.movie_id,
      showDate: r.show_date,
      showTime: r.show_time,
      seatAvailable: r.seat_available == null ? undefined : Number(r.seat_available),
      seatTotal: r.seat_total == null ? undefined : Number(r.seat_total),
      bookingUrl: r.booking_url ?? undefined,
      theater: t ? {
        id: String(t.id),
        name: String(t.name),
        city: t.city ? String(t.city) : '',
        lat: t.lat == null ? undefined : Number(t.lat),
        lng: t.lng == null ? undefined : Number(t.lng),
      } : null,
      movie: m ? movieRowToMovie(m) : null,
    }
  })

  return Response.json(rows, {
    headers: {
      'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
    },
  })
}
