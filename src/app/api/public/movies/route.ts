import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { movieRowToMovie } from '@/lib/supabase/movieRow'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('movies')
    .select('id,title,original_title,year,poster_url,genre,director,nation,kmdb_id,tmdb_id,rating')
    .order('title')

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const movies = (data ?? []).map((r) => movieRowToMovie(r as Record<string, unknown>))

  return Response.json(movies, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
