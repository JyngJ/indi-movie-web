/**
 * movie_details.synopsis 문장 경계 복원 백필 (1회성).
 * 사용법: npx tsx --env-file=.env.local scripts/backfill-synopsis-separators.ts [--apply]
 *
 * KMDB 오픈 API가 원본 줄바꿈을 공백 없이 지운 채 내려줘서 "…무엇인가?낯설지만"처럼
 * 문장이 붙은 값이 저장됐고, meta description·검색 스니펫에 그대로 노출됐다.
 * 저장 시점은 normalizeSynopsis로 막았고, 이 스크립트가 기존 행을 고친다.
 *
 * 기본은 드라이런(변경 미적용) — 바꿀 행 수와 샘플만 출력한다. --apply를 줘야 쓴다.
 * normalizeSynopsis가 멱등이라 여러 번 돌려도 안전하다.
 */
import { createClient } from '@supabase/supabase-js'
import { normalizeSynopsis } from '../src/lib/text/normalizeSynopsis'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
})

const apply = process.argv.includes('--apply')

type Row = { movie_id: string; synopsis: string }

async function fetchAll(): Promise<Row[]> {
  const rows: Row[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from('movie_details')
      .select('movie_id, synopsis')
      .not('synopsis', 'is', null)
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    if (!data?.length) break
    rows.push(...(data as Row[]))
    if (data.length < 1000) break
  }
  return rows
}

async function main() {
  const rows = await fetchAll()
  const changed = rows
    .map((row) => ({ ...row, next: normalizeSynopsis(row.synopsis) }))
    .filter((row) => row.next !== row.synopsis && row.next.length > 0)

  console.log(`시놉시스 보유: ${rows.length}행 / 수정 대상: ${changed.length}행`)
  for (const row of changed.slice(0, 10)) {
    console.log(`\n  ${row.movie_id}`)
    console.log(`  - ${row.synopsis.slice(0, 90)}`)
    console.log(`  + ${row.next.slice(0, 90)}`)
  }

  if (!apply) {
    console.log('\n드라이런 — 변경하지 않았어요. 적용하려면 --apply를 붙여 주세요.')
    return
  }

  let updated = 0
  let failed = 0
  for (const row of changed) {
    const { error } = await sb
      .from('movie_details')
      .update({ synopsis: row.next })
      .eq('movie_id', row.movie_id)
    if (error) {
      console.error(`  update 실패 ${row.movie_id}: ${error.message}`)
      failed++
    } else {
      updated++
    }
  }
  console.log(`\n완료 — 수정: ${updated}행 / 실패: ${failed}행`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
