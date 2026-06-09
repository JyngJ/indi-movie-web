import { MetadataRoute } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const revalidate = 86400

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.영화볼지도.com'
const PAGE_SIZE = 1000

export async function generateSitemaps() {
  const supabase = createSupabaseServerClient()
  const { count } = await supabase
    .from('movies')
    .select('id', { count: 'exact', head: true })

  const total = count ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return Array.from({ length: pageCount }, (_, i) => ({ id: i }))
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  const supabase = createSupabaseServerClient()
  const from = id * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data } = await supabase
    .from('movies')
    .select('id, updated_at')
    .range(from, to)
    .order('updated_at', { ascending: false })

  return (data ?? []).map((m) => ({
    url: `${BASE_URL}/movie/${m.id}`,
    lastModified: new Date(m.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))
}
