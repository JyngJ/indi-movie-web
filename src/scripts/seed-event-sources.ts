/**
 * 이벤트 소스 시드 스크립트
 * 사용법: npm run seed:event-sources
 *
 * ADMIN_EVENT_SOURCES 데이터를 event_sources 테이블에 upsert.
 * matched_theater_id는 theaters.name 매칭으로 자동 설정.
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
import { ADMIN_EVENT_SOURCES } from '@/lib/admin/event-sources.data'

async function seedEventSources() {
  const supabase = createSupabaseAdminClient()

  console.log(`\n📡 이벤트 소스 ${ADMIN_EVENT_SOURCES.length}개를 DB에 추가합니다...\n`)

  let successCount = 0
  let skipCount = 0
  let errorCount = 0

  for (const source of ADMIN_EVENT_SOURCES) {
    // 극장명으로 matched_theater_id 조회
    const { data: theater } = await supabase
      .from('theaters')
      .select('id')
      .eq('name', source.theaterName)
      .maybeSingle()

    if (!theater) {
      console.log(`⚠️  ${source.theaterName} — theaters 테이블에서 극장을 찾을 수 없습니다. matched_theater_id=null 로 삽입.`)
    }

    const row = {
      id: source.id,
      theater_id: source.theaterId || source.id,
      theater_name: source.theaterName,
      matched_theater_id: theater?.id ?? null,
      homepage_url: source.homepageUrl ?? null,
      listing_url: source.listingUrl,
      parser: source.parser,
      enabled: source.enabled,
      cadence: source.cadence,
      health: source.health,
      notes: source.notes ?? null,
    }

    const { error } = await supabase
      .from('event_sources')
      .upsert(row, { onConflict: 'id' })

    if (error) {
      console.log(`❌ ${source.theaterName} (${source.id}) — 오류: ${error.message}`)
      errorCount++
      continue
    }

    const matchedLabel = theater ? ` → 극장 ID ${theater.id.slice(0, 8)}...` : ' → 극장 미매칭'
    const enabledLabel = source.enabled ? '✅' : '⏸️ '
    console.log(`${enabledLabel} ${source.theaterName} (${source.parser})${matchedLabel}`)
    successCount++

    if (!theater) skipCount++
  }

  console.log(`\n📊 결과:`)
  console.log(`  완료: ${successCount}개`)
  console.log(`  극장 미매칭: ${skipCount}개 (수동으로 matched_theater_id 설정 필요)`)
  console.log(`  오류: ${errorCount}개\n`)

  if (successCount > 0) {
    console.log('✨ 이벤트 소스 시드 완료! Supabase event_sources 테이블 확인하세요.\n')
    console.log('💡 극장 미매칭 소스는 Supabase에서 직접 matched_theater_id 업데이트:\n')
    console.log('   UPDATE event_sources SET matched_theater_id = (SELECT id FROM theaters WHERE name = \'극장명\') WHERE id = \'evt-...\';')
  }
}

seedEventSources().catch((error) => {
  console.error('❌ 시드 스크립트 실행 중 오류:', error)
  process.exit(1)
})
