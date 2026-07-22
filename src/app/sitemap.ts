import { MetadataRoute } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const revalidate = 86400

// sitemap <loc>에 퍼센트인코딩 안 된 raw 한글 도메인이 들어가면 스펙 위반이라
// 네이버 서치어드바이저가 "사이트맵/RSS 형식이 올바르지 않습니다"로 거부한다.
// next.config.ts의 VERCEL_PROJECT_PRODUCTION_URL 오버라이드와 동일한 이유로 퓨니코드 사용.
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.xn--hq1bv8o5phw2d7wt.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createSupabaseServerClient()
  const [{ data: theaters }, { data: directors }, { data: festivals }] = await Promise.all([
    supabase.from('theaters').select('id, updated_at'),
    supabase.from('movies').select('director'),
    // is_active 필터 필수 — 비활성 영화제가 sitemap에 실리면 상세가 notFound()라
    // Search Console에 404가 쌓인다(죽은 극장 sitemap 이슈와 같은 재발 패턴).
    supabase.from('festivals').select('slug, updated_at').eq('is_active', true),
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

  const festivalUrls: MetadataRoute.Sitemap = (festivals ?? []).map((f) => (
    { url: `${BASE_URL}/festival/${f.slug}`, lastModified: new Date(f.updated_at), changeFrequency: 'weekly' as const, priority: 0.7 }
  ))

  return [
    { url: BASE_URL, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/films`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    ...theaterUrls,
    ...directorUrls,
    ...festivalUrls,
  ]
}
