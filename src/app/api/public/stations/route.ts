import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('stations')
    .select('id,source_id,name,lines,lat,lng,city,district,neighborhood,aliases')
    .order('name')

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const stations = (data ?? []).map((r) => ({
    id: r.id,
    sourceId: r.source_id ?? undefined,
    name: r.name,
    lines: (r.lines as string[] | null) ?? [],
    lat: Number(r.lat),
    lng: Number(r.lng),
    city: r.city,
    district: r.district ?? undefined,
    neighborhood: r.neighborhood ?? undefined,
    aliases: (r.aliases as string[] | null) ?? [],
  }))

  return Response.json(stations, {
    headers: {
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    },
  })
}
