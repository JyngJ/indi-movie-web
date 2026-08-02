import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createSupabaseAdminClient()
  const { data } = await supabase
    .from('curation_cache')
    .select('returning_films, new_indie_films, last_week_films, solo_theater_films')
    .eq('id', 1)
    .single()

  return Response.json({
    returningFilms: data?.returning_films ?? [],
    newIndieFilms: data?.new_indie_films ?? [],
    lastWeekFilms: data?.last_week_films ?? [],
    soloTheaterFilmsByRegion: data?.solo_theater_films ?? {},
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
    },
  })
}
