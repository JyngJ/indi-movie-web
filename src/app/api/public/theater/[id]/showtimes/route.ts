import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  if (!date) return Response.json({ error: 'date 필요' }, { status: 400 })

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('showtimes')
    .select(`
      id,
      screen_name,
      show_date,
      show_time,
      end_time,
      format_type,
      language,
      seat_available,
      seat_total,
      price,
      booking_url,
      movie_id,
      movies (
        id,
        title,
        original_title,
        year,
        poster_url,
        genre,
        director,
        nation,
        kmdb_id,
        tmdb_id,
        rating,
        movie_details(synopsis, runtime_minutes, certification)
      )
    `)
    .eq('theater_id', id)
    .eq('show_date', date)
    .eq('is_active', true)
    .order('show_time')

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const rows = data ?? []
  const movieMap = new Map<string, Record<string, unknown>>()
  for (const r of rows) {
    const m = r.movies as unknown as Record<string, unknown> | null
    if (!m || movieMap.has(r.movie_id)) continue
    const details = m.movie_details as Record<string, unknown> | null
    movieMap.set(r.movie_id, {
      id: String(m.id),
      title: String(m.title),
      originalTitle: m.original_title ? String(m.original_title) : undefined,
      year: Number(m.year),
      posterUrl: m.poster_url ? String(m.poster_url) : undefined,
      genre: (m.genre as string[]) ?? [],
      director: (m.director as string[]) ?? [],
      nation: m.nation ? String(m.nation) : undefined,
      synopsis: details?.synopsis ? String(details.synopsis) : undefined,
      runtimeMinutes: details?.runtime_minutes ? Number(details.runtime_minutes) : undefined,
      certification: details?.certification ? String(details.certification) : undefined,
      kmdbId: m.kmdb_id ? String(m.kmdb_id) : undefined,
      tmdbId: m.tmdb_id ? Number(m.tmdb_id) : undefined,
      rating: m.rating ? Number(m.rating) : undefined,
    })
  }

  const showtimes = rows.map((r) => ({
    id: r.id,
    movieId: r.movie_id,
    movieTitle: (r.movies as unknown as Record<string, unknown> | null)?.title as string ?? '',
    theaterId: id,
    screenName: r.screen_name,
    showDate: r.show_date,
    showTime: r.show_time,
    endTime: r.end_time ?? undefined,
    formatType: r.format_type,
    language: r.language,
    seatAvailable: r.seat_available,
    seatTotal: r.seat_total,
    price: r.price,
    bookingUrl: r.booking_url ?? undefined,
  }))

  return Response.json(
    { movies: Array.from(movieMap.values()), showtimes },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
      },
    },
  )
}
