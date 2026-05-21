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

async function testCrawl() {
  const supabase = createSupabaseAdminClient()

  console.log('\n🧪 크롤링 테스트 시작...\n')

  // dtryx 소스 중 하나 테스트
  const { data: sources } = await supabase
    .from('crawl_sources')
    .select('*')
    .eq('enabled', true)
    .eq('parser', 'dtryxReservationApi')
    .limit(1)

  if (!sources || sources.length === 0) {
    console.log('❌ dtryx 소스를 찾을 수 없습니다.')
    return
  }

  const testSource = sources[0]
  console.log(`테스트 대상: ${testSource.theater_name}`)
  console.log(`파서: ${testSource.parser}`)
  console.log(`URL: ${testSource.listing_url}\n`)

  // API 호출로 크롤링 실행
  console.log('API 호출 중...')

  try {
    const response = await fetch('http://localhost:3001/api/admin/crawl/all-dtryx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      console.log(`❌ API 오류: ${response.status}`)
      return
    }

    const result = await response.json()
    console.log(`\n✅ 크롤링 완료`)
    console.log(`결과:`, result)
  } catch (err) {
    console.log(`❌ 오류: ${err instanceof Error ? err.message : String(err)}`)
  }
}

testCrawl().catch(console.error)
