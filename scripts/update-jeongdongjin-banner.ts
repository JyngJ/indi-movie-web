/**
 * 정동진독립영화제 배너 URL 교체 — 구 jiff.kr 원본이 죽어(403) 새 CDN 이미지로.
 * 사용법: npx tsx --env-file=.env.local scripts/update-jeongdongjin-banner.ts
 */
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const NEW_URL = 'https://cdn.imweb.me/thumbnail/20260727/5cfc05b44b30f.jpeg'

async function main() {
  const { data: before, error: e1 } = await sb.from('festivals').select('id, name, slug, banner_url').ilike('name', '%정동진%')
  console.log('before:', JSON.stringify(before), e1 ?? '')
  if (!before || before.length !== 1) { console.error('row 1개 아님 — 중단'); process.exit(1) }
  const { error: e2 } = await sb.from('festivals').update({ banner_url: NEW_URL }).eq('id', before[0].id)
  if (e2) { console.error(e2); process.exit(1) }
  const { data: after } = await sb.from('festivals').select('id, name, banner_url').eq('id', before[0].id)
  console.log('after:', JSON.stringify(after))
}
main()
