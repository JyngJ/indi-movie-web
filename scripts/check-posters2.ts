import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
async function main() {
  const { data } = await sb.from('movies').select('title, poster_url').order('title')
  const noPoster = data?.filter(m => !m.poster_url) ?? []
  const hasPoster = data?.filter(m => m.poster_url) ?? []
  console.log(`포스터 있음: ${hasPoster.length} / 없음: ${noPoster.length}`)
  console.log('\n== 포스터 없는 영화 ==')
  for (const m of noPoster) console.log(`  ${m.title}`)
}
main().catch(console.error)
