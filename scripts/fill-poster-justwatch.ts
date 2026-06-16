/**
 * 포스터 없는 영화를 JustWatch GraphQL API로 채우기
 * 실행 (dry-run):  npx tsx --env-file=.env.local scripts/fill-poster-justwatch.ts
 * 실행 (적용):     npx tsx --env-file=.env.local scripts/fill-poster-justwatch.ts --apply
 */
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

const JW_GRAPHQL = 'https://apis.justwatch.com/graphql'
const JW_IMAGE_BASE = 'https://images.justwatch.com'
const JW_PROFILE = 's718'
const MAX_YEAR_DIFF = 5
// 제목이 너무 달라 잘못 매칭되는 케이스 수동 제외
const SKIP_TITLES = new Set(['승리의 시작'])

const QUERY = `
query Search($country: Country!, $language: Language!, $first: Int!, $filter: TitleFilter) {
  popularTitles(country: $country, first: $first, filter: $filter) {
    edges {
      node {
        content(country: $country, language: $language) {
          title
          originalReleaseYear
          posterUrl
        }
      }
    }
  }
}
`

interface JWNode {
  content: {
    title: string
    originalReleaseYear: number | null
    posterUrl: string | null
  }
}

async function searchJustWatch(query: string, year: number): Promise<string | null> {
  const res = await fetch(JW_GRAPHQL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; indi-movie-web/0.1)',
    },
    body: JSON.stringify({
      operationName: 'Search',
      variables: { country: 'KR', language: 'ko', first: 5, filter: { searchQuery: query } },
      query: QUERY,
    }),
    signal: AbortSignal.timeout(8000),
  })

  if (!res.ok) return null

  const data = await res.json() as { data?: { popularTitles?: { edges?: { node: JWNode }[] } } }
  const edges = data?.data?.popularTitles?.edges ?? []

  // 연도 가장 가까운 것 우선
  const sorted = [...edges].sort((a, b) => {
    const ay = a.node.content.originalReleaseYear ?? 9999
    const by = b.node.content.originalReleaseYear ?? 9999
    return Math.abs(ay - year) - Math.abs(by - year)
  })

  for (const edge of sorted) {
    const { posterUrl: raw, originalReleaseYear: ry } = edge.node.content
    if (!raw) continue
    if (ry && Math.abs(ry - year) > MAX_YEAR_DIFF) continue
    const url = `${JW_IMAGE_BASE}${raw}`
      .replace('{profile}', JW_PROFILE)
      .replace('{format}', 'jpg')
    return url
  }

  return null
}

async function main() {
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
    if (SKIP_TITLES.has(m.title)) { console.log('건너뜀 (블랙리스트)'); missing++; continue }
    try {
      const url = await searchJustWatch(m.title, m.year)
      if (!url) {
        console.log('없음')
        missing++
      } else {
        console.log(url)
        if (apply) {
          const { error: err } = await sb.from('movies').update({ poster_url: url }).eq('id', m.id)
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
    await new Promise(r => setTimeout(r, 300))
  }

  console.log(`\n완료 — 채울 수 있음: ${filled} / 없음: ${missing} / 실패: ${failed}`)
}

main().catch(console.error)
