import { createClient } from '@supabase/supabase-js'

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  // 현재 movies 테이블에 있는 indexes 확인
  const { data, error } = await sb.rpc('pg_indexes_for_table' as never, { tbl: 'movies' } as never)
  if (error) {
    // rpc 없으면 직접 insert 테스트로 확인
    console.log('rpc 불가 → insert 테스트로 확인')

    // 같은 kmdb_id, 다른 kmdb_movie_seq로 2개 insert 시도
    const test1 = await sb.from('movies').insert({
      title: '__test_A__', year: 2000, genre: [], director: [],
      kmdb_id: 'K', kmdb_movie_seq: 'TEST001',
    }).select('id').single()

    const test2 = await sb.from('movies').insert({
      title: '__test_B__', year: 2000, genre: [], director: [],
      kmdb_id: 'K', kmdb_movie_seq: 'TEST002',
    }).select('id').single()

    if (test1.error) {
      console.log('test1 실패:', test1.error.message)
    } else if (test2.error) {
      console.log('❌ 여전히 kmdb_id 단독 unique 제약 있음:', test2.error.message)
    } else {
      console.log('✅ 복합 unique 정상 동작 — 같은 kmdb_id, 다른 kmdb_movie_seq 둘 다 insert 성공')
      // 테스트 데이터 정리
      await sb.from('movies').delete().in('id', [test1.data.id, test2.data.id])
      console.log('  테스트 데이터 정리 완료')
    }
  } else {
    console.log(data)
  }
}

main().catch(console.error)
