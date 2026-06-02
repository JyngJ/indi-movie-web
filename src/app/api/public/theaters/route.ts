import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('theaters')
    .select('id,name,lat,lng,address,city,phone,website,instagram_url,screen_count,seat_count,parking,restaurant,accessibility,rating,created_at,updated_at')
    .order('name')

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const theaters = (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    lat: Number(r.lat),
    lng: Number(r.lng),
    address: r.address,
    city: r.city,
    phone: r.phone ?? undefined,
    website: r.website ?? undefined,
    instagramUrl: r.instagram_url ?? undefined,
    screenCount: r.screen_count,
    seatCount: r.seat_count ?? undefined,
    amenities: {
      parking: r.parking,
      restaurant: r.restaurant,
      accessibility: r.accessibility,
    },
    rating: r.rating ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }))

  return Response.json(theaters, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
