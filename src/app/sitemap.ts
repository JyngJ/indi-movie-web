import { MetadataRoute } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://yeonghwabolzido.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createSupabaseServerClient()
  const { data: theaters } = await supabase.from('theaters').select('id')

  const theaterUrls: MetadataRoute.Sitemap = (theaters ?? []).map((t) => ({
    url: `${BASE_URL}/theater/${t.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [
    { url: BASE_URL, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE_URL}/theater`, changeFrequency: 'weekly', priority: 0.9 },
    ...theaterUrls,
  ]
}
