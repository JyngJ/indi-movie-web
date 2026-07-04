import { MetadataRoute } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const revalidate = 86400

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.영화볼지도.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createSupabaseServerClient()
  const [{ data: theaters }, { data: directors }] = await Promise.all([
    supabase.from('theaters').select('id, updated_at'),
    supabase.from('movies').select('director'),
  ])

  const theaterUrls: MetadataRoute.Sitemap = (theaters ?? []).map((t) => (
    { url: `${BASE_URL}/theater/${t.id}`, lastModified: new Date(t.updated_at), changeFrequency: 'weekly' as const, priority: 0.8 }
  ))

  const directorNames = [...new Set(
    (directors ?? []).flatMap((m) => (m.director as string[] | null) ?? []).filter(Boolean)
  )]
  const directorUrls: MetadataRoute.Sitemap = directorNames.map((name) => ({
    url: `${BASE_URL}/films/director/${encodeURIComponent(name)}`,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  return [
    { url: BASE_URL, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/films`, changeFrequency: 'daily', priority: 0.9 },
    ...theaterUrls,
    ...directorUrls,
  ]
}
