import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createSupabaseAdminClient()
  const { data } = await supabase
    .from('film_rankings')
    .select('week_start, rankings')
    .order('week_start', { ascending: false })
    .limit(1)
    .single()

  if (!data) return Response.json(null, { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } })

  const row = data as Record<string, unknown>
  return Response.json({
    week_start: String(row.week_start),
    rankings: row.rankings ?? [],
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
