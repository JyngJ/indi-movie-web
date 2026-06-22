/**
 * extmovie.com 포스터 → KMDB 자동 교체
 * (extmovie.com는 Referer 있으면 403 → 앱에서 전부 깨짐)
 *
 * 실행: npx tsx src/scripts/fix-extmovie-posters.ts
 * 옵션:
 *   --dry-run   실제 업데이트 안 함 (기본: 업데이트)
 */

import * as fs from 'fs'
import * as path from 'path'

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const c = fs.readFileSync(envPath, 'utf-8')
  c.split('\n').forEach(l => {
    const m = l.match(/^([^=]+)=(.*)$/)
    if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim()
  })
}

import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const DRY_RUN = process.argv.includes('--dry-run')
const KMDB_KEY = process.env.KMDB_SERVICE_KEY!
const KMDB_BASE = 'https://api.koreafilm.or.kr/openapi-data2/wisenut/search_api/search_json2.jsp'

async function findKmdbPoster(title: string, year?: number): Promise<string | null> {
  try {
    const url = new URL(KMDB_BASE)
    url.searchParams.set('collection', 'kmdb_new2')
    url.searchParams.set('ServiceKey', KMDB_KEY)
    url.searchParams.set('query', title)
    url.searchParams.set('detail', 'Y')
    url.searchParams.set('listCount', '5')
    if (year) {
      url.searchParams.set('releaseDts', `${year - 1}0101`)
      url.searchParams.set('releaseDte', `${year + 1}1231`)
    }
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const data = await res.json() as { Data?: Array<{ Result?: Array<{ posters?: string }> }> }
    const items = data.Data?.[0]?.Result ?? []
    for (const item of items) {
      const raw = item.posters ?? ''
      const first = raw.split('|')[0].trim()
      if (!first) continue
      return first.replace(/^http:\/\//, 'https://')
    }
    return null
  } catch {
    return null
  }
}

async function main() {
  const sb = createSupabaseAdminClient()
  console.log(`\n🔧 extmovie.com 포스터 교체 (${DRY_RUN ? 'dry-run' : 'LIVE'})\n`)

  const { data: movies, error } = await sb
    .from('movies')
    .select('id,title,year,nation,poster_url')
    .like('poster_url', '%extmovie.com%')
    .order('title')

  if (error) { console.error(error.message); process.exit(1) }
  if (!movies?.length) { console.log('없음'); return }

  console.log(`총 ${movies.length}편\n`)

  let fixed = 0, nulled = 0

  for (const m of movies) {
    const title = m.title as string
    const year = m.year as number | undefined
    console.log(`  [${title} (${year ?? '?'})]`)

    const newUrl = await findKmdbPoster(title, year)

    if (!newUrl) {
      console.log(`    → KMDB 없음, poster_url null 처리`)
      if (!DRY_RUN) {
        await sb.from('movies').update({ poster_url: null }).eq('id', m.id)
      }
      nulled++
      continue
    }

    console.log(`    → ${newUrl}`)
    if (!DRY_RUN) {
      const { error: upErr } = await sb.from('movies').update({ poster_url: newUrl }).eq('id', m.id)
      if (upErr) console.log(`    ✗ 실패: ${upErr.message}`)
      else fixed++
    } else {
      fixed++
    }
  }

  console.log(`\n완료: KMDB 교체 ${fixed}개, null 처리 ${nulled}개`)
}

main().catch(e => { console.error(e); process.exit(1) })
