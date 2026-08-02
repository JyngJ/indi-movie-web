import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  if (!from || !to) return Response.json({ error: 'from/to 필요' }, { status: 400 })

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('showtimes')
    .select(`
      movie_id,
      show_date,
      movies (
        id, title, original_title, year, poster_url, genre, director,
        nation, kmdb_id, tmdb_id, rating,
        movie_details(synopsis, runtime_minutes, certification)
      )
    `)
    .eq('theater_id', id)
    .eq('is_active', true)
    .gte('show_date', from)
    .lte('show_date', to)
    .order('show_date')
    .limit(1000)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const entryMap = new Map<string, {
    movie: Record<string, unknown>
    showtimeCount: number
    earliestDate: string
    availableDates: string[]
  }>()

  for (const r of data ?? []) {
    const m = r.movies as unknown as Record<string, unknown> | null
    if (!m) continue
    const movieId = String(m.id)
    const details = m.movie_details as Record<string, unknown> | null

    if (!entryMap.has(movieId)) {
      entryMap.set(movieId, {
        movie: {
          id: movieId,
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
        },
        showtimeCount: 0,
        earliestDate: r.show_date,
        availableDates: [],
      })
    }

    const entry = entryMap.get(movieId)!
    entry.showtimeCount++
    if (!entry.availableDates.includes(r.show_date)) entry.availableDates.push(r.show_date)
    if (r.show_date < entry.earliestDate) entry.earliestDate = r.show_date
  }

  const result = Array.from(entryMap.values()).sort((a, b) => b.showtimeCount - a.showtimeCount)

  return Response.json(result, {
    headers: {
      'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
    },
  })
}
