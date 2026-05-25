/**
 * 포스터 없는 영화를 Wikipedia pageimages API로 채우기
 *
 * 전략:
 *  1) 외국 영화 → original_title 원제로 영어 위키 검색
 *  2) 한국 영화  → 한국어 제목으로 한국어 위키 검색
 *  3) 둘 다 실패 → 제목+연도 영어 위키 검색
 *
 * 실행 (dry-run):  npx tsx --env-file=.env.local scripts/fill-poster-wiki.ts
 * 실행 (적용):     npx tsx --env-file=.env.local scripts/fill-poster-wiki.ts --apply
 */
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

// original_title 필드에서 검색용 제목만 추출
// "Ma Nuit chez Maud (1969)" → "Ma Nuit chez Maud"
// "Hapax Legomena I: Nostalgia (1971)" → "Hapax Legomena I: Nostalgia"
// "(Gisaengchung ) (1968)" → "Gisaengchung"  ← 한국어 원제 없는 경우
function cleanOriginalTitle(raw: string): string {
  return raw
    .replace(/\([^)]*\d{4}[^)]*\)/g, '') // (1969), (2023) 등 연도 포함 괄호 제거
    .replace(/\([^)]*[가-힣]+[^)]*\)/g, '') // 한글 포함 괄호(로마자 표기 등) 제거
    .replace(/^\(|\)$/g, '') // 앞뒤 남은 괄호
    .replace(/\s+/g, ' ')
    .trim()
}

async function wikiSearch(query: string, lang: string): Promise<string[]> {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=5&format=json`
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url)
    const text = await res.text()
    if (text.startsWith('You are making')) { await sleep(5000); continue }
    try {
      const j = JSON.parse(text) as { query?: { search?: Array<{ title: string; snippet: string }> } }
      return j.query?.search?.map(h => h.title) ?? []
    } catch { return [] }
  }
  return []
}

async function wikiSummary(title: string, lang: string): Promise<{ thumb: string; extract: string } | null> {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
  const res = await fetch(url)
  if (!res.ok) return null
  const j = await res.json() as { thumbnail?: { source: string }; extract?: string }
  if (!j.thumbnail?.source) return null
  return { thumb: j.thumbnail.source, extract: j.extract ?? '' }
}

async function wikiThumb(lang: string, title: string, year: number): Promise<string | null> {
  const hits = await wikiSearch(`${title} ${year} film`, lang)
  await sleep(600)
  if (hits.length === 0) return null

  // 연도 포함된 제목 우선, 그다음 film/영화 포함, 나머지 순서로 시도
  const ordered = [
    hits.find(h => h.includes(String(year))),
    hits.find(h => /film|영화/i.test(h)),
    ...hits,
  ].filter((h, i, a) => h && a.indexOf(h) === i) as string[]

  for (const pageTitle of ordered.slice(0, 3)) {
    const s = await wikiSummary(pageTitle, lang)
    await sleep(500)
    if (!s) continue
    // 사람 페이지 필터
    if (/(born\s+\d{4}|is\s+a[n]?\s+(actor|actress|singer|musician|director|filmmaker|politician|writer))/i.test(s.extract)) continue
    // 인물 사진 파일명 필터
    if (/portrait|headshot|photo_of|_cut\.|profile/i.test(s.thumb)) continue
    // SVG/GIF 필터 (로고, 아이콘, 애니메이션, SVG→PNG 렌더)
    if (/\.svg[\/?]/i.test(s.thumb) || /\.(svg|gif)$/i.test(s.thumb)) continue
    // Film Festival 포스터 (내용이 영화 자체가 아님)
    if (/film.festival|cannes|sundance|berlinale/i.test(s.thumb)) continue
    // Commons 이미지는 낮은 신뢰도: 포스터처럼 생긴 파일명 아니면 스킵
    const isCommons = s.thumb.includes('/commons/')
    const looksLikePoster = /poster|cover|film|movie|cinema|affiche/i.test(s.thumb)
    if (isCommons && !looksLikePoster) continue
    return s.thumb
  }
  return null
}

async function findPoster(koTitle: string, origTitle: string | null, year: number, isKorean: boolean): Promise<{ url: string; source: string } | null> {
  // 1) 외국 영화: 원제로 영어 위키
  if (!isKorean && origTitle) {
    const clean = cleanOriginalTitle(origTitle)
    if (clean.length > 1) {
      const url = await wikiThumb('en', clean, year)
      if (url) return { url, source: `en-wiki: "${clean}"` }
    }
  }

  // 2) 한국 영화: 한국어 제목으로 한국어 위키
  if (isKorean) {
    const url = await wikiThumb('ko', koTitle, year)
    if (url) return { url, source: `ko-wiki: "${koTitle}"` }
  }

  // 3) 폴백: 외국 영화만 한국어 제목으로 영어 위키 추가 검색
  //    (한국 영화는 엉뚱한 페이지로 히트할 가능성이 높으므로 건너뜀)
  if (!isKorean) {
    const url = await wikiThumb('en', koTitle, year)
    if (url) return { url, source: `en-wiki (ko-title): "${koTitle}"` }
  }

  return null
}

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

async function main() {
  const apply = process.argv.includes('--apply')
  if (!apply) console.log('🔍 dry-run 모드 (--apply 추가하면 실제 저장)\n')

  const { data: movies, error } = await sb
    .from('movies')
    .select('id, title, original_title, year, nation')
    .is('poster_url', null)
    .order('title')

  if (error) { console.error('fetch 실패:', error.message); process.exit(1) }

  type Row = { id: string; title: string; original_title: string | null; year: number; nation: string | null }
  const targets = (movies ?? []) as Row[]
  console.log(`포스터 없는 영화: ${targets.length}개\n`)

  let filled = 0, missing = 0, failed = 0

  for (const m of targets) {
    const isKorean = (m.nation ?? '').includes('대한민국')
    process.stdout.write(`  ${m.title} (${m.year}) ... `)
    try {
      const result = await findPoster(m.title, m.original_title, m.year, isKorean)
      if (!result) {
        console.log('없음')
        missing++
      } else {
        console.log(`[${result.source}]\n    → ${result.url}`)
        if (apply) {
          const { error: err } = await sb.from('movies').update({ poster_url: result.url }).eq('id', m.id)
          if (err) { console.log(`    ❌ 저장 실패: ${err.message}`); failed++ }
          else { console.log(`    ✅ 저장`); filled++ }
        } else {
          filled++
        }
      }
    } catch (e) {
      console.log(`에러: ${(e as Error).message}`)
      failed++
    }
    await sleep(500)
  }

  console.log(`\n완료 — 채울 수 있음: ${filled} / 없음: ${missing} / 실패: ${failed}`)
}

main().catch(console.error)
