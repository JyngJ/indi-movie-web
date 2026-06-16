/**
 * 포스터 없는 영화를 Naver API로 채우기
 * 1차: Naver 영화검색 API (/v1/search/movie.json) — 포스터 URL 직접 반환
 * 2차: Naver 이미지검색 API (/v1/search/image) — fallback
 *
 * 실행 (dry-run):  npx tsx --env-file=.env.local scripts/fill-poster-naver.ts
 * 실행 (적용):     npx tsx --env-file=.env.local scripts/fill-poster-naver.ts --apply
 */
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

const CLIENT_ID = process.env.NAVER_CLIENT_ID!
const CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET!

const NAVER_HEADERS = {
  'X-Naver-Client-Id': CLIENT_ID,
  'X-Naver-Client-Secret': CLIENT_SECRET,
}

function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, '').trim()
}

// ── 1차: 네이버 영화 검색 ─────────────────────────────────────────
interface NaverMovieItem {
  title: string
  image: string
  pubDate: string  // "YYYY" 형식
  director: string // "이름|" 형식
}

async function searchNaverMovie(title: string, year: number): Promise<string | null> {
  const url = `https://openapi.naver.com/v1/search/movie.json?query=${encodeURIComponent(title)}&display=10`
  const res = await fetch(url, { headers: NAVER_HEADERS })
  if (!res.ok) return null

  const j = await res.json() as { items?: NaverMovieItem[] }
  const items = j.items ?? []

  // 연도 일치하는 것 우선, 없으면 첫 번째
  const sorted = [...items].sort((a, b) => {
    const aMatch = Math.abs(Number(a.pubDate) - year)
    const bMatch = Math.abs(Number(b.pubDate) - year)
    return aMatch - bMatch
  })

  for (const item of sorted) {
    const img = item.image?.trim()
    if (img && img.startsWith('http')) return img
  }
  return null
}

// ── 2차: 네이버 이미지 검색 (fallback) ──────────────────────────
interface NaverImageItem {
  link: string
  sizewidth: string
  sizeheight: string
}

async function searchNaverImage(query: string): Promise<NaverImageItem[]> {
  const url = `https://openapi.naver.com/v1/search/image?query=${encodeURIComponent(query)}&display=10&sort=sim`
  const res = await fetch(url, { headers: NAVER_HEADERS })
  if (!res.ok) return []
  const j = await res.json() as { items?: NaverImageItem[] }
  return j.items ?? []
}

const TRUSTED_DOMAINS = [
  'justwatch.com', 'watcha.com', 'watchaplay.com',
  'cgv.co.kr', 'megabox.co.kr', 'lottecinema.co.kr',
  'kobis.or.kr', 'kmdb.or.kr', 'koreafilm.or.kr',
  'movie.naver.com', 'indieground.kr', 'kofic.or.kr',
  'indiestory.com', 'extmovie.com', 'cine21.com',
  'kmovie.or.kr', 'bifan.kr', 'biff.kr', 'docs.or.kr',
]

async function findPosterImage(title: string, year: number): Promise<string | null> {
  for (const query of [`${title} 영화 포스터`, `${title} ${year} 포스터`]) {
    const items = await searchNaverImage(query)
    const isPortrait = (it: NaverImageItem) => {
      const w = parseInt(it.sizewidth), h = parseInt(it.sizeheight)
      return h > 0 && w > 0 && h / w > 1.3 && Math.min(w, h) >= 300
    }
    const portraits = items.filter(it => {
      if (!isPortrait(it)) return false
      if (TRUSTED_DOMAINS.some(d => it.link.includes(d))) return true
      return /poster|film|movie|영화|포스터/i.test(it.link)
    })
    if (portraits[0]) return portraits[0].link
    await new Promise(r => setTimeout(r, 200))
  }
  return null
}

async function findPoster(title: string, year: number): Promise<{ url: string; source: string } | null> {
  // 1차: 네이버 영화 검색
  const movieUrl = await searchNaverMovie(title, year)
  if (movieUrl) return { url: movieUrl, source: 'movie-api' }

  await new Promise(r => setTimeout(r, 200))

  // 2차: 이미지 검색 fallback
  const imageUrl = await findPosterImage(title, year)
  if (imageUrl) return { url: imageUrl, source: 'image-api' }

  return null
}

async function main() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 없음')
    process.exit(1)
  }

  const apply = process.argv.includes('--apply')
  if (!apply) console.log('🔍 dry-run 모드 (--apply 추가하면 실제 저장)\n')

  const { data: movies, error } = await sb
    .from('movies')
    .select('id, title, year')
    .is('poster_url', null)
    .order('title')

  if (error) { console.error('fetch 실패:', error.message); process.exit(1) }

  type Row = { id: string; title: string; year: number }
  const targets = (movies ?? []) as Row[]
  console.log(`포스터 없는 영화: ${targets.length}개\n`)

  let filled = 0, missing = 0, failed = 0

  for (const m of targets) {
    process.stdout.write(`  ${m.title} (${m.year}) ... `)
    try {
      const result = await findPoster(m.title, m.year)
      if (!result) {
        console.log('없음')
        missing++
      } else {
        console.log(`[${result.source}] ${result.url}`)
        if (apply) {
          const { error: err } = await sb.from('movies').update({ poster_url: result.url }).eq('id', m.id)
          if (err) { console.log(`  ❌ 저장 실패: ${err.message}`); failed++ }
          else { console.log(`  ✅ 저장`); filled++ }
        } else {
          filled++
        }
      }
    } catch (e) {
      console.log(`에러: ${(e as Error).message}`)
      failed++
    }
    await new Promise(r => setTimeout(r, 200))
  }

  console.log(`\n완료 — 채울 수 있음: ${filled} / 없음: ${missing} / 실패: ${failed}`)
}

main().catch(console.error)
