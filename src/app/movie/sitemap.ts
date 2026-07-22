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
const MAX_ATTEMPTS = 3

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function generateSitemaps() {
  const supabase = createSupabaseServerClient()
  let lastMessage = '원인 불명'

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { count, error } = await supabase
      .from('movies')
      .select('id', { count: 'exact', head: true })

    if (!error && count != null) {
      const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE))
      return Array.from({ length: pageCount }, (_, i) => ({ id: i }))
    }
    lastMessage = error?.message ?? 'count가 null로 반환됨'
    if (attempt < MAX_ATTEMPTS) await sleep(500 * attempt)
  }
  // 조용히 total=0으로 넘어가면 sitemap 자체가 안 생기거나 페이지 수가 실제보다
  // 적게 잡힌다 — 재시도까지 다 실패하면 빌드를 실패시켜 눈에 띄게 한다.
  throw new Error(`movie sitemap: count 조회 ${MAX_ATTEMPTS}회 재시도 후 실패 — ${lastMessage}`)
}

export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  // Next.js 16부터 generateSitemaps의 id가 Promise<string>으로 전달된다 (await 안 하면
  // id가 Promise 객체 그대로라 id * PAGE_SIZE가 NaN이 되고, .range(NaN, NaN)이 에러 없이
  // 빈 배열을 반환해서 실제 원인이었다 — 재시도로는 절대 못 잡는 결정론적 버그였음).
  const id = Number(await props.id)
  const supabase = createSupabaseServerClient()
  const from = id * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  let lastMessage = '원인 불명'

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { data, error } = await supabase
      .from('movies')
      .select('id, updated_at')
      .range(from, to)
      .order('updated_at', { ascending: false })

    // id Promise를 안 기다린 버그(위 주석)로 에러 없는 빈 배열을 실제로 겪었다 —
    // 그 버그는 고쳤지만 방어적으로 에러뿐 아니라 빈 결과도 재시도 대상으로 유지한다.
    if (!error && data && data.length > 0) {
      return data.map((m) => (
        { url: `${BASE_URL}/movie/${m.id}`, lastModified: new Date(m.updated_at), changeFrequency: 'weekly' as const, priority: 0.7 }
      ))
    }
    lastMessage = error?.message ?? '에러 없이 빈 배열 반환'
    if (attempt < MAX_ATTEMPTS) await sleep(500 * attempt)
  }
  // 조용히 빈 배열을 반환하면 검색엔진에 빈 sitemap이 그대로 배포된다 — throw하면
  // Next ISR이 재생성 실패 시 직전 정상 캐시를 계속 서빙한다(stale-on-error).
  throw new Error(`movie sitemap[${id}]: 조회 ${MAX_ATTEMPTS}회 재시도 후 실패 — ${lastMessage}`)
}
