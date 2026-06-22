/**
 * 포스터 URL 상태 점검 + KMDB 자동 복구
 *
 * 실행: npx tsx src/scripts/check-poster-health.ts
 * 옵션:
 *   --fix       깨진 포스터를 KMDB에서 자동 복구 (기본: dry-run)
 *   --title 큐어  특정 영화만 처리
 *
 * 동작:
 *   1. movies 테이블 전체(또는 지정 영화) 로드
 *   2. poster_url HEAD 요청으로 200 여부 확인
 *   3. 깨진 항목 → KMDB 검색 → 첫 번째 유효 포스터로 업데이트 (--fix 시)
 */

import * as fs from 'fs'
import * as path from 'path'

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const [, key, value] = match
      if (!process.env[key.trim()]) process.env[key.trim()] = value.trim()
    }
  })
}

import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const FIX = process.argv.includes('--fix')
const TITLE_FILTER = (() => {
  const i = process.argv.indexOf('--title')
  return i >= 0 ? process.argv[i + 1] : undefined
})()
const KMDB_KEY = process.env.KMDB_SERVICE_KEY!
const KMDB_BASE = 'https://api.koreafilm.or.kr/openapi-data2/wisenut/search_api/search_json2.jsp'
const CONCURRENCY = 8

// ── 포스터 URL 유효성 체크 ─────────────────────────────────────────
async function checkUrl(url: string): Promise<boolean> {
  try {
    const httpsUrl = url.replace(/^http:\/\//, 'https://')
    const res = await fetch(httpsUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
    return res.ok
  } catch {
    return false
  }
}

// ── KMDB 검색 → 첫 번째 유효 포스터 URL ──────────────────────────
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
    const data = await res.json() as { Data?: Array<{ Result?: Array<{ posters?: string; title?: string }> }> }
    const items = data.Data?.[0]?.Result ?? []
    for (const item of items) {
      const raw = item.posters ?? ''
      const first = raw.split('|')[0].trim()
      if (!first) continue
      const httpsUrl = first.replace(/^http:\/\//, 'https://')
      if (await checkUrl(httpsUrl)) return httpsUrl
    }
    return null
  } catch {
    return null
  }
}

// ── 병렬 제한 실행 ───────────────────────────────────────────────
async function runConcurrent<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = []
  let idx = 0
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++
      results[i] = await tasks[i]()
    }
  }
  await Promise.all(Array.from({ length: limit }, worker))
  return results
}

// ── main ─────────────────────────────────────────────────────────
async function main() {
  const supabase = createSupabaseAdminClient()
  console.log(`\n🔍 포스터 상태 점검 시작 (mode: ${FIX ? 'FIX' : 'dry-run'})${TITLE_FILTER ? ` — "${TITLE_FILTER}" 만` : ''}\n`)

  let query = supabase.from('movies').select('id,title,year,poster_url,kmdb_id')
  if (TITLE_FILTER) query = query.ilike('title', `%${TITLE_FILTER}%`)
  else query = query.not('poster_url', 'is', null)

  const { data: movies, error } = await query
  if (error) { console.error('DB 오류:', error.message); process.exit(1) }
  if (!movies?.length) { console.log('영화 없음'); return }

  console.log(`총 ${movies.length}편 검사`)

  const broken: typeof movies = []
  const tasks = movies.map(m => async () => {
    const url = m.poster_url as string | null
    if (!url) { broken.push(m); return }
    const ok = await checkUrl(url)
    if (!ok) broken.push(m)
    process.stdout.write(ok ? '.' : 'X')
  })
  await runConcurrent(tasks, CONCURRENCY)
  console.log('\n')

  if (broken.length === 0) {
    console.log('✅ 모든 포스터 정상')
    return
  }

  console.log(`❌ 깨진 포스터 ${broken.length}개:`)
  for (const m of broken) {
    console.log(`  • [${m.id}] ${m.title} (${m.year ?? '?'}) — ${m.poster_url ?? '없음'}`)
  }

  if (!FIX) {
    console.log('\n⚠️  --fix 옵션 없음. 실제 업데이트 생략.')
    return
  }

  console.log('\n🔧 KMDB에서 포스터 복구 중...\n')
  let fixed = 0, failed = 0
  for (const m of broken) {
    const newUrl = await findKmdbPoster(m.title as string, m.year as number | undefined)
    if (!newUrl) {
      console.log(`  ✗ ${m.title} — KMDB 포스터 없음`)
      failed++
      continue
    }
    const { error: upErr } = await supabase
      .from('movies')
      .update({ poster_url: newUrl })
      .eq('id', m.id)
    if (upErr) {
      console.log(`  ✗ ${m.title} — DB 업데이트 실패: ${upErr.message}`)
      failed++
    } else {
      console.log(`  ✓ ${m.title} → ${newUrl}`)
      fixed++
    }
  }

  console.log(`\n완료: ${fixed}개 복구, ${failed}개 실패`)
}

main().catch(e => { console.error(e); process.exit(1) })
