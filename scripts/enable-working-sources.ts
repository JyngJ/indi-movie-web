/**
 * 비활성화된 크롤 소스를 전부 테스트하고, 후보가 1개 이상 수집되면 enabled=true로 설정.
 * 실행: npx tsx --env-file=.env.local scripts/enable-working-sources.ts
 */

import { createClient } from '@supabase/supabase-js'
import { listAdminSources } from '@/lib/admin/store'
import { crawlShowtimeCandidates } from '@/lib/admin/crawler'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const CONCURRENCY = 8
const TIMEOUT_MS = 60_000

async function main() {
  const allSources = await listAdminSources()
  const disabled = allSources.filter((s) => !s.enabled)
  console.log(`비활성 소스 ${disabled.length}개 테스트 시작 (동시 ${CONCURRENCY}개)\n`)

  const results: { ok: boolean; count: number; error?: string }[] = new Array(disabled.length)
  let completed = 0
  let nextIdx = 0

  async function worker() {
    while (nextIdx < disabled.length) {
      const i = nextIdx++
      const source = disabled[i]
      try {
        const crawlPromise = crawlShowtimeCandidates({ source, inputKind: 'url', sourceUrl: source.listingUrl })
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('타임아웃')), TIMEOUT_MS),
        )
        const candidates = await Promise.race([crawlPromise, timeout])
        results[i] = { ok: true, count: candidates.length }
        const icon = candidates.length > 0 ? '✅' : '⚪'
        console.log(`${icon} [${++completed}/${disabled.length}] ${source.theaterName}: ${candidates.length}개`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        results[i] = { ok: false, count: 0, error: msg }
        console.log(`⚠️  [${++completed}/${disabled.length}] ${source.theaterName}: ${msg.slice(0, 80)}`)
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, disabled.length) }, worker))

  const working = disabled.filter((_, i) => results[i].ok && results[i].count > 0)
  const empty   = disabled.filter((_, i) => results[i].ok && results[i].count === 0)
  const failed  = disabled.filter((_, i) => !results[i].ok)

  console.log(`\n=== 결과 ===`)
  console.log(`수집 성공: ${working.length}개 → enabled=true 설정`)
  console.log(`수집 0개:  ${empty.length}개 (비활성 유지)`)
  console.log(`오류:      ${failed.length}개 (비활성 유지)`)

  if (failed.length > 0) {
    console.log(`\n실패 목록:`)
    failed.forEach((s) => {
      const r = results[disabled.indexOf(s)]
      console.log(`  - ${s.theaterName}: ${r.error}`)
    })
  }

  if (working.length === 0) {
    console.log('\n활성화할 소스가 없습니다.')
    return
  }

  const { error } = await supabase
    .from('crawl_sources')
    .update({ enabled: true })
    .in('id', working.map((s) => s.id))

  if (error) throw new Error(`enabled 업데이트 실패: ${error.message}`)

  console.log(`\n✅ ${working.length}개 소스 활성화 완료`)
  working.forEach((s) => console.log(`  - ${s.theaterName}`))
}

main().catch((err) => { console.error(err); process.exit(1) })
