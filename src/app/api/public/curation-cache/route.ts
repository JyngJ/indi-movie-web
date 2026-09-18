import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createSupabaseAdminClient()
  const { data } = await supabase
    .from('curation_cache')
    .select('returning_films, new_indie_films, last_week_films, solo_theater_films')
    .eq('id', 1)
    .single()

  /* 큐레이션 계산은 씨네21 별점으로 저평점작을 거르므로 캐시 JSON에 movie.rating이 남아 있다.
     씨네21 고유 데이터라 공개 응답에서는 걷어낸다(2026-09-18). */
  const strip = (v: unknown): unknown => JSON.parse(JSON.stringify(v ?? null, (k, val) => (k === 'rating' ? undefined : val)))
  return Response.json({
    returningFilms: strip(data?.returning_films) ?? [],
    newIndieFilms: strip(data?.new_indie_films) ?? [],
    lastWeekFilms: strip(data?.last_week_films) ?? [],
    soloTheaterFilmsByRegion: strip(data?.solo_theater_films) ?? {},
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
    },
  })
}
