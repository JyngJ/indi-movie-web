/**
 * 크롤링 소스 데이터 시드 스크립트
 * 사용법: npm run seed:sources
 */

import * as fs from 'fs'
import * as path from 'path'
import { randomUUID } from 'crypto'

// .env.local 파일 로드
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

async function seedCrawlSources() {
  const supabase = createSupabaseAdminClient()

  console.log(`\n📡 크롤링 소스 ${crawlSourcesToAdd.length}개를 DB에 추가합니다...\n`)

  let successCount = 0
  let skipCount = 0
  let errorCount = 0

  for (const source of crawlSourcesToAdd) {
    try {
      // 극장명으로 극장 조회
      const { data: theater } = await supabase
        .from('theaters')
        .select('id')
        .eq('name', source.theaterName)
        .single()

      if (!theater) {
        console.log(`⚠️  ${source.theaterName} — 극장을 찾을 수 없습니다.`)
        errorCount++
        continue
      }

      // 중복 체크: 극장 + URL 조합으로 확인
      const { data: existing } = await supabase
        .from('crawl_sources')
        .select('id')
        .eq('theater_id', theater.id)
        .eq('listing_url', source.listingUrl)
        .single()

      if (existing) {
        console.log(`⏭️  ${source.theaterName} — 이미 존재합니다.`)
        skipCount++
        continue
      }

      // 크롤링 소스 추가
      const { data, error } = await supabase
        .from('crawl_sources')
        .insert({
          id: randomUUID(),
          theater_id: theater.id,
          theater_name: source.theaterName,
          homepage_url: source.homepageUrl,
          listing_url: source.listingUrl,
          parser: source.parser,
          enabled: true,
          cadence: source.cadence,
          health: 'healthy',
          notes: source.notes || null,
        })
        .select()

      if (error) {
        console.log(`❌ ${source.theaterName} — 오류: ${error.message}`)
        errorCount++
        continue
      }

      if (data) {
        console.log(`✅ ${source.theaterName} (${source.parser})`)
        successCount++
      }
    } catch (err) {
      console.log(`❌ ${source.theaterName} — 예외: ${err instanceof Error ? err.message : String(err)}`)
      errorCount++
    }
  }

  console.log(`\n📊 결과:`)
  console.log(`  ✅ 추가됨: ${successCount}개`)
  console.log(`  ⏭️  이미 존재: ${skipCount}개`)
  console.log(`  ❌ 오류/누락: ${errorCount}개`)
  console.log(`  📈 총: ${crawlSourcesToAdd.length}개\n`)

  if (successCount > 0) {
    console.log('✨ 크롤링 소스 추가 완료! 어드민 콘솔을 새로고침하면 반영됩니다.\n')
  }
}

seedCrawlSources().catch((error) => {
  console.error('❌ 시드 스크립트 실행 중 오류:', error)
  process.exit(1)
})
