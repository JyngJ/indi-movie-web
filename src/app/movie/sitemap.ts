import { MetadataRoute } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const revalidate = 86400

// sitemap <loc>에 퍼센트인코딩 안 된 raw 한글 도메인이 들어가면 스펙 위반이라
// 네이버 서치어드바이저가 "사이트맵/RSS 형식이 올바르지 않습니다"로 거부한다.
// next.config.ts의 VERCEL_PROJECT_PRODUCTION_URL 오버라이드와 동일한 이유로 퓨니코드 사용.
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.xn--hq1bv8o5phw2d7wt.com'
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

  return (data ?? []).map((m) => (
    { url: `${BASE_URL}/movie/${m.id}`, lastModified: new Date(m.updated_at), changeFrequency: 'weekly' as const, priority: 0.7 }
  ))
}
