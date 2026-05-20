import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
async function main() {
  const { data, error } = await sb
    .from('movies')
    .select('title, kmdb_id, kmdb_movie_seq, movie_details(synopsis)')
    .order('title')
  if (error) throw error
  const total = data?.length ?? 0
  const synopsisOf = (m: { movie_details: { synopsis?: string | null }[] | { synopsis?: string | null } | null }) => {
    const details = Array.isArray(m.movie_details) ? m.movie_details[0] : m.movie_details
    return details?.synopsis ?? ''
  }
  const hasSynopsis = data?.filter(m => synopsisOf(m).trim().length > 0) ?? []
  const noSynopsis = data?.filter(m => synopsisOf(m).trim().length === 0) ?? []
  console.log(`전체: ${total} / 시놉시스 있음: ${hasSynopsis.length} / 없음: ${noSynopsis.length}`)
  console.log('\n== 시놉시스 없는 영화 ==')
  for (const m of noSynopsis) console.log(`  ${m.title} (${m.kmdb_id}/${m.kmdb_movie_seq})`)
  console.log('\n== 시놉시스 있는 영화 (미리보기) ==')
  for (const m of hasSynopsis) console.log(`  ${m.title}: ${synopsisOf(m).slice(0, 60)}...`)
}
main().catch(console.error)
