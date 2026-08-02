import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('movies')
    .select(`
      id, title, original_title, year, poster_url, genre, director,
      nation, kmdb_id, tmdb_id, rating,
      movie_details (
        synopsis,
        runtime_minutes,
        certification,
        cast_members
      )
    `)
    .eq('id', id)
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!data) return Response.json(null, { status: 404 })

  const row = data as Record<string, unknown>
  const details = row.movie_details as Record<string, unknown> | null

  return Response.json({
    id: String(row.id),
    title: String(row.title),
    originalTitle: row.original_title ? String(row.original_title) : undefined,
    year: Number(row.year),
    posterUrl: row.poster_url ? String(row.poster_url) : undefined,
    genre: (row.genre as string[] | null) ?? [],
    director: (row.director as string[] | null) ?? [],
    nation: row.nation ? String(row.nation) : undefined,
    kmdbId: row.kmdb_id ? String(row.kmdb_id) : undefined,
    tmdbId: row.tmdb_id ? Number(row.tmdb_id) : undefined,
    rating: row.rating ? Number(row.rating) : undefined,
    synopsis: details?.synopsis ? String(details.synopsis) : undefined,
    runtimeMinutes: details?.runtime_minutes ? Number(details.runtime_minutes) : undefined,
    certification: details?.certification ? String(details.certification) : undefined,
    cast: (details?.cast_members as unknown[] | null) ?? [],
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800',
    },
  })
}
