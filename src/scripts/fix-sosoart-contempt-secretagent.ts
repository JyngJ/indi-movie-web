import * as fs from 'fs'
import * as path from 'path'

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const [, key, value] = match
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = value.trim()
      }
    }
  })
}

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { approveShowtimeCandidates } from '@/lib/admin/store'

const CONTEMPT_GODARD_ID = '061e1bff-90da-4bdf-9335-d7bbdfbbd4e3' // 경멸, 장-뤽 고다르, 1963
const SECRET_AGENT_KLEBER_ID = '62899b92-ef53-4681-b3a5-0a2134a42771' // 시크릿 에이전트, 클레버 멘도사 필루, 2025
const SECRET_AGENT_HAMPTON_ID = '28637621-a982-48ae-acc8-74803629fb12' // 오탐: 시크릿 에이전트, 크리스토퍼 햄튼, 1996

async function main() {
  const supabase = createSupabaseAdminClient()

  // 1) 크리스토퍼 햄튼 버전으로 잘못 매칭된 건을 클레버 멘도사 필루 버전으로 교정
  const { data: wrongRows, error: wrongError } = await supabase
    .from('showtime_candidates')
    .select('id')
    .ilike('theater_name', '%소소아트%')
    .eq('movie_title', '시크릿 에이전트')
    .eq('matched_movie_id', SECRET_AGENT_HAMPTON_ID)

  if (wrongError) throw wrongError

  if (wrongRows?.length) {
    const { error: fixError } = await supabase
      .from('showtime_candidates')
      .update({ matched_movie_id: SECRET_AGENT_KLEBER_ID })
      .in('id', wrongRows.map((r) => r.id))
    if (fixError) throw fixError
    console.log(`교정: ${wrongRows.length}건 (시크릿 에이전트 1996판 → 2025판)`)
  } else {
    console.log('교정 대상 없음 (이미 올바르게 매칭됨)')
  }

  // 2) 소소아트시네마의 경멸 / 시크릿 에이전트 needs_review 후보 전체 승인
  const { data: candidates, error: candError } = await supabase
    .from('showtime_candidates')
    .select('id, movie_title, matched_movie_id')
    .ilike('theater_name', '%소소아트%')
    .in('movie_title', ['경멸', '시크릿 에이전트'])
    .eq('status', 'needs_review')

  if (candError) throw candError

  const ids = (candidates ?? []).map((c) => c.id)
  console.log(`승인 대상: ${ids.length}건`)
  console.log(JSON.stringify(candidates, null, 2))

  if (ids.length === 0) return

  const result = await approveShowtimeCandidates(ids, null)
  console.log(`\n승인 결과: 성공 ${result.approved.length}개 / 실패 ${result.failed.length}개`)
  if (result.failed.length) console.log(JSON.stringify(result.failed, null, 2))
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1) })
