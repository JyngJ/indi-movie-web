import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
async function main() {
  const { data } = await sb.from('movies').select('title, synopsis, kmdb_id, kmdb_movie_seq').order('title')
  const total = data?.length ?? 0
  const hasSynopsis = data?.filter(m => m.synopsis && (m.synopsis as string).trim().length > 0) ?? []
  const noSynopsis = data?.filter(m => !m.synopsis || (m.synopsis as string).trim().length === 0) ?? []
  console.log(`전체: ${total} / 시놉시스 있음: ${hasSynopsis.length} / 없음: ${noSynopsis.length}`)
  console.log('\n== 시놉시스 없는 영화 ==')
  for (const m of noSynopsis) console.log(`  ${m.title} (${m.kmdb_id}/${m.kmdb_movie_seq})`)
  console.log('\n== 시놉시스 있는 영화 (미리보기) ==')
  for (const m of hasSynopsis) console.log(`  ${m.title}: ${(m.synopsis as string).slice(0, 60)}...`)
}
main().catch(console.error)
