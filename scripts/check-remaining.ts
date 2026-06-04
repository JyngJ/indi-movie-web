import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  // 국제시장, 빅풋주니어 DB 확인
  for (const title of ['국제시장', '빅풋주니어', '빅풋']) {
    const { data } = await supabase.from('movies').select('id, title, year').ilike('title', `%${title}%`)
    console.log(`"${title}": ${data?.map(m => `${m.title}(${m.year})`).join(', ') || '없음'}`)
  }

  // KMDB_SERVICE_KEY 있는지
  console.log('\nKMDB_SERVICE_KEY:', process.env.KMDB_SERVICE_KEY ? '✅ 있음' : '❌ 없음')
}
main()
