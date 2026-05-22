import * as fs from 'fs'

const envContent = fs.readFileSync('.env.local', 'utf-8')
const env = {}
envContent.split('\n').forEach((line) => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    const [, key, value] = match
    env[key.trim()] = value.trim().replace(/^"/, '').replace(/"$/, '')
  }
})

const { createClient } = await import('@supabase/supabase-js')
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

console.log('🔍 극장 삭제 상태 확인:\n')

// 삭제해야 했던 것들
const deleted = [
  { name: '씨네아트리좀', id: '90c87360-e132-4802-a9b5-7ce10121d363' },
  { name: '인디플러스 포항', id: '104fb60b-f1af-4c06-9645-a729c5d468d1' },
  { name: '씨네 인디유', id: '82c3a58e-76c8-484d-ae8a-581976a13dff' }
]

for (const item of deleted) {
  const { data } = await supabase
    .from('crawl_sources')
    .select('id, theater_name')
    .eq('id', item.id)
    .single()
  
  if (data) {
    console.log(`❌ 여전히 존재: "${item.name}"`)
  } else {
    console.log(`✅ 삭제됨: "${item.name}"`)
  }
}

// 씨네아트 전체 확인
console.log('\n씨네아트 전체:')
const { data: cineart } = await supabase
  .from('crawl_sources')
  .select('id, theater_name, enabled')
  .ilike('theater_name', '%씨네아트%')

cineart?.forEach(c => {
  const status = c.enabled ? '활성' : '비활성'
  console.log(`  "${c.theater_name}" [${status}]`)
})
