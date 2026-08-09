import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { movieRowToMovie } from '@/lib/supabase/movieRow'
import { enforceRateLimit } from '@/lib/rateLimit/guard'
import { RATE_LIMIT_POLICIES } from '@/lib/rateLimit/policies'

export const dynamic = 'force-dynamic'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DAY_MS = 24 * 60 * 60 * 1000

/**
 * 쿼리스트링이 CDN 캐시 키라서, 범위 검사가 없으면 날짜를 조금씩 바꾸는 것만으로
 * 무한히 캐시를 비껴가며 매번 5중 조인을 때릴 수 있다(캐시 키 폭파).
 * 실제 화면이 쓰는 범위(오늘~D+30, 커스텀 선택)보다 넉넉하되 유한하게 묶는다.
 */
const MAX_SPAN_DAYS = 62
const MAX_PAST_DAYS = 90
const MAX_FUTURE_DAYS = 365

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

  const fromMs = Date.parse(`${from}T00:00:00Z`)
  const toMs = Date.parse(`${to}T00:00:00Z`)
  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) {
    return Response.json({ error: '존재하지 않는 날짜입니다.' }, { status: 400 })
  }

  const todayMs = Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`)
  if (toMs < fromMs) {
    return Response.json({ error: 'to는 from 이후여야 합니다.' }, { status: 400 })
  }
  if ((toMs - fromMs) / DAY_MS > MAX_SPAN_DAYS) {
    return Response.json({ error: `조회 기간은 최대 ${MAX_SPAN_DAYS}일입니다.` }, { status: 400 })
  }
  if (fromMs < todayMs - MAX_PAST_DAYS * DAY_MS || toMs > todayMs + MAX_FUTURE_DAYS * DAY_MS) {
    return Response.json({ error: '조회 가능한 날짜 범위를 벗어났습니다.' }, { status: 400 })
  }

  if (theaterId && !UUID_RE.test(theaterId)) {
    return Response.json({ error: 'theaterId 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  // Number('abc') === NaN이면 .gt(seat_total, NaN)으로 그대로 흘러가므로 여기서 막는다.
  const minSeatTotalValue = minSeatTotal ? Number(minSeatTotal) : null
  if (minSeatTotalValue != null && !Number.isInteger(minSeatTotalValue)) {
    return Response.json({ error: 'minSeatTotal은 정수여야 합니다.' }, { status: 400 })
  }

  // 여기까지 오면 CDN 캐시 미스라는 뜻 — 미스 자체를 IP당 제한해 조인 쿼리 폭주를 끊는다.
  const limited = await enforceRateLimit(request, RATE_LIMIT_POLICIES.showtimesWindow)
  if (limited) return limited

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
  if (minSeatTotalValue != null) query = query.gt('seat_total', minSeatTotalValue)

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
