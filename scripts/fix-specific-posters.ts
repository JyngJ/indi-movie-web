/**
 * 특정 영화 포스터 URL 확인 및 Naver로 교체
 * 실행 (dry-run):  npx tsx --env-file=.env.local scripts/fix-specific-posters.ts
 * 실행 (적용):     npx tsx --env-file=.env.local scripts/fix-specific-posters.ts --apply
 */
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)
const CLIENT_ID = process.env.NAVER_CLIENT_ID!
const CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET!

const TARGETS = ['부부', '큐어', '리프라이즈']

async function searchNaverPoster(title: string, year: number): Promise<string | null> {
  const url = `https://openapi.naver.com/v1/search/movie.json?query=${encodeURIComponent(title)}&display=10`
  const res = await fetch(url, {
    headers: { 'X-Naver-Client-Id': CLIENT_ID, 'X-Naver-Client-Secret': CLIENT_SECRET },
  })
  if (!res.ok) return null
  const j = await res.json() as { items?: { title: string; image: string; pubDate: string }[] }
  const items = (j.items ?? []).sort((a, b) =>
    Math.abs(Number(a.pubDate) - year) - Math.abs(Number(b.pubDate) - year)
  )
  for (const item of items) {
    const img = item.image?.trim()
    if (img && img.startsWith('http')) return img
  }
  return null
}

async function checkUrl(url: string): Promise<boolean> {
  try {
    const r = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
    return r.ok
  } catch { return false }
}

async function main() {
  const apply = process.argv.includes('--apply')
  if (!apply) console.log('🔍 dry-run 모드 (--apply 추가하면 실제 저장)\n')

  const { data: movies, error } = await sb
    .from('movies')
    .select('id, title, year, poster_url')
    .in('title', TARGETS)

  if (error) { console.error(error); process.exit(1) }
  if (!movies?.length) { console.log('대상 영화를 찾지 못했습니다.'); return }

  for (const movie of movies) {
    console.log(`\n▶ ${movie.title} (${movie.year})`)
    console.log(`  현재 URL: ${movie.poster_url ?? '없음'}`)

    // 현재 URL 접근 가능 여부
    if (movie.poster_url) {
      const isHttp = movie.poster_url.startsWith('http://')
      const ok = await checkUrl(movie.poster_url)
      console.log(`  URL 상태: ${ok ? '✅ OK' : '❌ 접근 불가'}${isHttp ? ' ⚠️  http:// (mixed-content 차단)' : ''}`)
      if (ok && !isHttp) { console.log('  → 건너뜀 (이미 유효)'); continue }
    }

    // http:// → https:// 시도 먼저
    let newUrl: string | null = null
    if (movie.poster_url?.startsWith('http://')) {
      const httpsUrl = movie.poster_url.replace('http://', 'https://')
      const ok = await checkUrl(httpsUrl)
      if (ok) { newUrl = httpsUrl; console.log(`  https 변환 성공: ${newUrl}`) }
    }

    // fallback: Naver에서 새 URL 가져오기
    if (!newUrl) newUrl = await searchNaverPoster(movie.title, movie.year)
    if (!newUrl) { console.log('  ❌ 새 포스터 못 찾음'); continue }
    if (!movie.poster_url?.startsWith('http://')) console.log(`  새 URL: ${newUrl}`)

    if (apply) {
      const { error: e } = await sb.from('movies').update({ poster_url: newUrl }).eq('id', movie.id)
      console.log(e ? `  ❌ 업데이트 실패: ${e.message}` : '  ✅ 저장됨')
    }
  }
}
main().catch(console.error)
