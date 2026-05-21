/**
 * 작동하지 않는 크롤링 소스 비활성화 스크립트
 * 사용법: npm run seed:disable-broken
 *
 * dtryx, moonhwain, petitecine 플랫폼만 활성화
 * 나머지 tableText 파서 소스들은 비활성화
 */

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
import { crawlSourcesToAdd } from '@/data/crawl-sources-to-add'

const WORKING_PLATFORMS = [
  'www.dtryx.com',
  'dtryx.com',
  'moonhwain.kr',
  'moonhwain.net',
  'petitecine.com',
]

async function disableBrokenSources() {
  const supabase = createSupabaseAdminClient()

  console.log(`\n🔧 작동하지 않는 크롤링 소스를 비활성화합니다...\n`)

  const working: string[] = []
  const broken: string[] = []

  for (const source of crawlSourcesToAdd) {
    const isWorking = WORKING_PLATFORMS.some(platform =>
      source.listingUrl?.includes(platform) ||
      source.homepageUrl?.includes(platform)
    )

    if (isWorking) {
      working.push(source.theaterName)
    } else {
      broken.push(source.theaterName)
    }
  }

  console.log(`✅ 작동 가능한 소스 (${working.length}개):`)
  working.forEach(name => console.log(`   - ${name}`))

  console.log(`\n❌ 비활성화할 소스 (${broken.length}개):`)
  broken.slice(0, 5).forEach(name => console.log(`   - ${name}`))
  if (broken.length > 5) {
    console.log(`   ... 외 ${broken.length - 5}개`)
  }

  console.log(`\n데이터베이스 업데이트 중...`)

  // 작동 불가능한 소스들 비활성화
  if (broken.length > 0) {
    const { error } = await supabase
      .from('crawl_sources')
      .update({ enabled: false })
      .in('theater_name', broken)

    if (error) {
      console.log(`❌ 업데이트 오류: ${error.message}`)
      return
    }
  }

  console.log(`\n📊 결과:`)
  console.log(`  ✅ 활성화된 소스: ${working.length}개`)
  console.log(`  ⏸️  비활성화된 소스: ${broken.length}개`)
  console.log(`\n💡 팁: 향후 극장 웹사이트가 복구되면 어드민에서 활성화할 수 있습니다.\n`)
}

disableBrokenSources().catch((error) => {
  console.error('❌ 스크립트 실행 중 오류:', error)
  process.exit(1)
})
