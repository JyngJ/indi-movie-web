import { MetadataRoute } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const revalidate = 86400

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.xn--hq1bv8o5phw2d7wt.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createSupabaseServerClient()
  const { data: theaters } = await supabase.from('theaters').select('id, updated_at')

  const theaterUrls: MetadataRoute.Sitemap = (theaters ?? []).map((t) => ({
    url: `${BASE_URL}/theater/${t.id}`,
    lastModified: new Date(t.updated_at),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [
    { url: BASE_URL, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE_URL}/theater`, changeFrequency: 'weekly', priority: 0.9 },
    ...theaterUrls,
  ]
}
