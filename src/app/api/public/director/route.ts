import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { toSecureImageUrl } from '@/lib/media/imageUrl'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const name = searchParams.get('name')
  if (!name) return Response.json({ error: 'name 필요' }, { status: 400 })

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('directors')
    .select('name, original_name, photo_url, bio, source')
    .eq('name', name)
    .single()

  if (error || !data) return Response.json(null, { status: 200, headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' } })

  const row = data as Record<string, unknown>
  return Response.json({
    name: String(row.name),
    originalName: row.original_name ? String(row.original_name) : undefined,
    photoUrl: row.photo_url ? toSecureImageUrl(String(row.photo_url)) : undefined,
    bio: row.bio ? String(row.bio) : undefined,
    source: row.source ? String(row.source) : undefined,
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
    },
  })
}
