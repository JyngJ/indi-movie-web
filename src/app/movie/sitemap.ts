import { MetadataRoute } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// 24h였던 걸 1h로 단축 — /theater/[id]와 동일한 주기. 빌드 시점에 조회가 일시적으로
// 비정상이었을 때 그 결과가 하루 종일 박제되는 걸 막는다(throw 처리와 함께 동작).
export const revalidate = 3600

// sitemap <loc>에 퍼센트인코딩 안 된 raw 한글 도메인이 들어가면 스펙 위반이라
// 네이버 서치어드바이저가 "사이트맵/RSS 형식이 올바르지 않습니다"로 거부한다.
// next.config.ts의 VERCEL_PROJECT_PRODUCTION_URL 오버라이드와 동일한 이유로 퓨니코드 사용.
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.xn--hq1bv8o5phw2d7wt.com'
const PAGE_SIZE = 1000

export async function generateSitemaps() {
  const supabase = createSupabaseServerClient()
  const { count, error } = await supabase
    .from('movies')
    .select('id', { count: 'exact', head: true })

  // 카운트 조회가 실패하면 조용히 total=0으로 넘어가 sitemap 자체가 안 생기거나
  // 페이지 수가 실제보다 적게 잡힌다 — 빌드를 실패시켜 눈에 띄게 한다.
  if (error) throw new Error(`movie sitemap: count 조회 실패 — ${error.message}`)

  const total = count ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return Array.from({ length: pageCount }, (_, i) => ({ id: i }))
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  const supabase = createSupabaseServerClient()
  const from = id * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data, error } = await supabase
    .from('movies')
    .select('id, updated_at')
    .range(from, to)
    .order('updated_at', { ascending: false })

  // 조회 실패를 조용히 빈 배열로 넘기면 검색엔진에 빈 sitemap이 그대로 배포된다.
  if (error) throw new Error(`movie sitemap[${id}]: 조회 실패 — ${error.message}`)

  return (data ?? []).map((m) => (
    { url: `${BASE_URL}/movie/${m.id}`, lastModified: new Date(m.updated_at), changeFrequency: 'weekly' as const, priority: 0.7 }
  ))
}
