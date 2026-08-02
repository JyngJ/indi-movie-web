import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/** 오늘 이후 활성 상영 (movieId, theaterId) 쌍 — /films 필터링·특별전 계산용 경량 라우트 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const theaterIds = searchParams.get('theaterIds')
  const today = new Date().toISOString().slice(0, 10)

  const supabase = createSupabaseAdminClient()
  let query = supabase
    .from('showtimes')
    .select('movie_id, theater_id')
    .eq('is_active', true)
    .gte('show_date', today)

  if (theaterIds) query = query.in('theater_id', theaterIds.split(','))

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const seen = new Set<string>()
  const pairs: { movieId: string; theaterId: string }[] = []
  for (const r of data ?? []) {
    const key = `${r.theater_id}:${r.movie_id}`
    if (seen.has(key)) continue
    seen.add(key)
    pairs.push({ movieId: r.movie_id, theaterId: r.theater_id })
  }

  return Response.json(pairs, {
    headers: {
      'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
    },
  })
}
