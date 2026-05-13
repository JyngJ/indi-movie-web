import { createClient } from '@supabase/supabase-js'

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data } = await sb.from('movies')
    .select('title, year, director, kmdb_id, kmdb_movie_seq')
    .order('title')

  for (const m of (data ?? [])) {
    const dir = Array.isArray(m.director) ? m.director.join(', ') : String(m.director ?? '')
    console.log(`${m.title} (${m.year}) | 감독: ${dir || '없음'} | KMDB: ${m.kmdb_id ?? '-'}/${m.kmdb_movie_seq ?? '-'}`)
  }
}

main().catch(console.error)
