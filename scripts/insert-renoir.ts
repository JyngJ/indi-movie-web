import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

async function main() {
  const { data, error } = await sb.from('movies').insert({
    title: '르누아르',
    original_title: 'ルノワール',
    year: 2025,
    nation: '일본,프랑스,싱가포르',
    genre: ['드라마'],
    director: ['하야카와 치에'],
    poster_url: 'http://file.koreafilm.or.kr/thm/02/99/19/34/tn_DPF032893.jpg',
    kmdb_id: 'F',
    kmdb_movie_seq: '64556',
  }).select('id, title, year').single()

  if (error) { console.error('insert 실패:', error.message); process.exit(1) }
  console.log('삽입 완료:', JSON.stringify(data))

  // Update showtime_candidates
  const { data: updated, error: err2 } = await sb
    .from('showtime_candidates')
    .update({ matched_movie_id: data!.id })
    .ilike('movie_title', '%르누아르%')
    .is('matched_movie_id', null)
    .select('id, movie_title, theater_id')

  if (err2) { console.error('후보 업데이트 실패:', err2.message) }
  else console.log(`후보 ${updated?.length ?? 0}개 연결 완료`)
}

main().catch(console.error)
