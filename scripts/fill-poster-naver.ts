/**
 * 포스터 없는 영화를 Naver 영화 검색 API로 채우기
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

interface NaverImageItem {
  link: string
  sizewidth: string
  sizeheight: string
}

async function searchNaverImage(query: string): Promise<NaverImageItem[]> {
  const url = `https://openapi.naver.com/v1/search/image?query=${encodeURIComponent(query)}&display=10&sort=sim`
  const res = await fetch(url, {
    headers: {
      'X-Naver-Client-Id': CLIENT_ID,
      'X-Naver-Client-Secret': CLIENT_SECRET,
    },
  })
  if (!res.ok) return []
  const j = await res.json() as { items?: NaverImageItem[] }
  return j.items ?? []
}

async function findPoster(title: string, year: number): Promise<string | null> {
  // "영화제목 영화 포스터" 쿼리로 검색
  for (const query of [`${title} 영화 포스터`, `${title} ${year} 포스터`]) {
    const items = await searchNaverImage(query)

    // 신뢰할 수 있는 영화 포스터 도메인 (최우선)
    const TRUSTED_DOMAINS = [
      'justwatch.com', 'watcha.com', 'watchaplay.com',
      'cgv.co.kr', 'megabox.co.kr', 'lottecinema.co.kr',
      'kobis.or.kr', 'kmdb.or.kr', 'koreafilm.or.kr',
      'movie.naver.com', 'indieground.kr', 'kofic.or.kr',
      'indiestory.com', 'extmovie.com', 'cine21.com',
      'kmovie.or.kr', 'bifan.kr', 'biff.kr', 'docs.or.kr',
    ]

    const isPortrait = (it: NaverImageItem) => {
      const w = parseInt(it.sizewidth), h = parseInt(it.sizeheight)
      return h > 0 && w > 0 && h / w > 1.3 && Math.min(w, h) >= 300
    }
    const hasPosterKeyword = (url: string) => /poster|film|movie|영화|포스터/i.test(url)

    const portraits = items.filter(it => {
      if (!isPortrait(it)) return false
      // 신뢰 도메인이면 무조건 OK
      if (TRUSTED_DOMAINS.some(d => it.link.includes(d))) return true
      // 아니면 URL에 포스터 관련 키워드 있을 때만
      return hasPosterKeyword(it.link)
    })

    const hit = portraits[0] ?? null
    if (hit) return hit.link

    await new Promise(r => setTimeout(r, 300))
  }
  return null
}

async function main() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 환경변수가 없습니다.')
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
      const posterUrl = await findPoster(m.title, m.year)
      if (!posterUrl) {
        console.log('없음')
        missing++
      } else {
        console.log(posterUrl)
        if (apply) {
          const { error: err } = await sb.from('movies').update({ poster_url: posterUrl }).eq('id', m.id)
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
